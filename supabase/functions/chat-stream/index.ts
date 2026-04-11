// supabase/functions/chat-stream/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // نُهيئ ReadableStream لإرسال بيانات الذكاء الاصطناعي على هيئة تدفق مباشر
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const sendChunk = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // ... هنا تقوم بالاتصال بـ AI Provider (Gemini / Phi-4) ...
        // مثال لمحاكاة تدفق سريع للأحرف أو الإشعارات لتقليل TTFB
        const chunks = ["أهلاً", " بك", " في", " SkillSwap", " ..."];
        
        for (const chunk of chunks) {
          sendChunk({ text: chunk });
          // محاكاة لتدفق الـ AI
          await new Promise(resolve => setTimeout(resolve, 300)); 
        }
        
        sendChunk({ done: true });
        controller.close();
      } catch (err) {
        console.error("Stream Error", err);
        controller.error(err);
      }
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream', // إجباري لدعم التدفق المباشر
      'Cache-Control': 'no-cache, no-store, must-revalidate', // إيقاف تام للـ Buffering
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff'
    },
  });
});
