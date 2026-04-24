import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2.15.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        let body;
        try {
            body = await req.json();
        } catch {
            body = {};
        }

        // fallback to querystring if GET
        const url = new URL(req.url);
        const country = url.searchParams.get('country') || body.country;

        // In Edge Functions, state is ephemeral, so finding a room dynamically with memory maps 
        // is restricted to a single isolate. But we generate random rooms if not assigned.
        const identity = body.identity || `user_${Math.floor(Math.random() * 10000)}`;
        const roomName = body.roomName || `room_${Math.random().toString(36).substring(2, 10)}`;

        const apiKey = Deno.env.get('LIVEKIT_API_KEY') || process.env.LIVEKIT_API_KEY || '';
        const apiSecret = Deno.env.get('LIVEKIT_API_SECRET') || process.env.LIVEKIT_API_SECRET || '';
        const livekitUrl = Deno.env.get('LIVEKIT_URL') || process.env.LIVEKIT_URL || '';

        if (!apiKey || !apiSecret || !livekitUrl) {
            throw new Error("Missing LIVEKIT environment variables");
        }

        // توليد التوكن على Edge لحظياً
        const at = new AccessToken(apiKey, apiSecret, { identity, ttl: 24 * 60 * 60 });
        at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

        // In Supabase Edge Functions, 'toJwt()' must wait for crypto ops
        const token = await at.toJwt();

        return new Response(JSON.stringify({ token, roomName, url: livekitUrl }), {
            status: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                // إلغاء التأخير الناتج عن أي تخزين مؤقت للـ Token
                'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (err: any) {
        console.error(err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
