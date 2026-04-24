import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache to prevent repeated fetches in the same cold start
const cache = new Map<string, any>();

function isUrlValid(url: string) {
  return /^https?:\/\/[^\s\]\[<>"]+$/i.test(url);
}

function checkSafety(urlStr: string) {
  try {
    const url = new URL(urlStr);
    const domain = url.hostname.toLowerCase();
    
    // Whitelist known domains
    if (domain.endsWith('.skillswap.com') || domain.endsWith('.supabase.co') || domain === 'skillswap.com') {
      return { safe: true };
    }
    
    // Blacklist known phishing / scam patterns
    const suspiciousDomains = ['bit.ly', 'tinyurl.com', 'scam.com', 'free-money.run', 'ngrok.io'];
    if (suspiciousDomains.some(d => domain.includes(d))) {
      return { safe: false, warning: 'تم رصد نطاق مشبوه (قد يكون تصيداً أو تتبعاً).' };
    }
    
    // In a real production app, integration with Google Safe Browsing API would be here.
    return { safe: true };
  } catch {
    return { safe: false, warning: 'تنسيق رابط غير صالح.' };
  }
}

function extractMetaTag(html: string, property: string): string | null {
  const metaRegex = new RegExp(`<meta[^>]*?(?:name|property)=["']?${property}["']?[^>]*?content=["']([^"']*)["']`, 'i');
  const match = html.match(metaRegex);
  if (match && match[1]) {
      return cleanHtml(match[1]);
  }
  return null;
}

function cleanHtml(str: string) {
  // Prevent basic XSS vectors
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { url } = body;

    if (!url || !isUrlValid(url)) {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      });
    }

    if (cache.has(url)) {
      return new Response(JSON.stringify(cache.get(url)), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const safety = checkSafety(url);
    if (!safety.safe) {
      const responseObj = {
        title: null,
        description: null,
        image: null,
        domain: new URL(url).hostname,
        safe: false,
        warning: safety.warning
      };
      cache.set(url, responseObj);
      return new Response(JSON.stringify(responseObj), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 sec timeout

    try {
      const fetchRes = await fetch(url, {
        redirect: 'manual', // Prevent open redirectors entirely
        signal: controller.signal,
        headers: {
          'User-Agent': 'SkillSwapBot/1.0 (+https://skillswap.com)' // Identify as bot
        }
      });

      clearTimeout(timeout);

      // If redirect, we just take the target location's domain or reject it.
      // We do not auto-follow to prevent circumvention.
      if (fetchRes.status >= 300 && fetchRes.status < 400) {
        const title = "تم إعادة توجيه الرابط";
        const domain = new URL(url).hostname;
        const result = { title, description: null, image: null, domain, safe: safety.safe, warning: safety.warning };
        cache.set(url, result);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      let html = '';
      if (fetchRes.ok) {
         html = await fetchRes.text();
      }

      // Fallback strategies for title
      const titleMatches = /<title[^>]*>([^<]+)<\/title>/gi.exec(html);
      const title = extractMetaTag(html, 'og:title') || extractMetaTag(html, 'twitter:title') || (titleMatches ? titleMatches[1] : null);
      const description = extractMetaTag(html, 'og:description') || extractMetaTag(html, 'twitter:description') || extractMetaTag(html, 'description') || null;
      const image = extractMetaTag(html, 'og:image') || extractMetaTag(html, 'twitter:image') || null;
      const domain = new URL(url).hostname;

      const result = {
        title: title ? cleanHtml(title) : domain,
        description: description ? cleanHtml(description) : null,
        image, // Image is a URL, usually clean but it goes to img src so it's relatively safe
        domain,
        safe: safety.safe,
        warning: safety.warning
      };

      cache.set(url, result);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (e: any) {
      clearTimeout(timeout);
      throw e;
    }

  } catch (error: any) {
    console.error('Link preview error:', error.message);
    const result = { error: 'Failed to fetch link preview' };
    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 500 
    });
  }
});
