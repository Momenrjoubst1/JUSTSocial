import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for cold starts (persists across invocations on the same edge isolate)
let blockedWordsCache: Map<string, number> | null = null;
let lastCacheUpdate: number = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

// Rate limiting cache (Reset when isolate is restarted, good enough for basic spam protection)
const userRequests = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

async function getBlockedWords(supabaseUrl: string, supabaseServiceRoleKey: string) {
  const now = Date.now();
  if (blockedWordsCache && (now - lastCacheUpdate) < CACHE_TTL) {
    return blockedWordsCache;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabase.from('blocked_words').select('word, severity');
  
  if (error) {
    console.error("Failed to fetch blocked words:", error);
    if (blockedWordsCache) return blockedWordsCache; 
    return new Map<string, number>();
  }

  const newCache = new Map<string, number>();
  for (const item of data) {
    newCache.set(item.word, item.severity);
  }
  
  blockedWordsCache = newCache;
  lastCacheUpdate = now;
  return blockedWordsCache;
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Extract headers for Auth validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 401 
      });
    }

    const { text, userId } = await req.json();

    if (!userId || typeof userId !== 'string') {
        return new Response(JSON.stringify({ error: 'Bad Request: userId is required' }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
        });
    }

    if (!text || typeof text !== 'string') {
       return new Response(JSON.stringify({ allowed: true, severity: 0, censoredText: text }), { 
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
       });
    }

    // Rate Limiting (Protects edge function from abuse)
    const now = Date.now();
    const userRate = userRequests.get(userId) || { count: 0, timestamp: now };
    
    if (now - userRate.timestamp > RATE_LIMIT_WINDOW) {
      userRate.count = 1;
      userRate.timestamp = now;
    } else {
      userRate.count++;
    }
    userRequests.set(userId, userRate);

    if (userRate.count > MAX_REQUESTS_PER_WINDOW) {
      console.warn(`Rate limit exceeded for user: ${userId}`);
      return new Response(JSON.stringify({ allowed: false, severity: 0, censoredText: text, error: 'Rate limit exceeded' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429
      });
    }

    // Fetch blocked words
    const wordsMap = await getBlockedWords(supabaseUrl, supabaseServiceRoleKey);

    let normalizedText = text.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
    let hasViolation = false;
    let maxSeverity = 0;
    
    let censoredText = text;

    for (const [word, severity] of wordsMap.entries()) {
      let normalizedWord = word.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
      if (normalizedText.includes(normalizedWord)) {
        hasViolation = true;
        if (severity > maxSeverity) maxSeverity = severity;
        
        // Build regex for replacement
        let pattern = word.replace(/[اأإآ]/g, '[اأإآ]').replace(/[هة]/g, '[هة]');
        const regex = new RegExp(pattern, 'gi');
        censoredText = censoredText.replace(regex, '***');
      }
    }

    if (hasViolation) {
        // Logging without exposing sensitive plaintext
        console.info(`Moderation hit for user ${userId}: Severity ${maxSeverity}`);
    }

    // Always return allowed: true for valid requests, unless it's an extreme case or abuse. 
    // This allows the client to proceed with sending the flagged message to the DB for the trigger to process the ban.
    return new Response(JSON.stringify({ allowed: true, severity: maxSeverity, censoredText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error in check-content-moderation:", error.message);
    return new Response(JSON.stringify({ allowed: false, error: 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
