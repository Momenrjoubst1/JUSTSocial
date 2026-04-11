import { serve } from "https://deno.land/std@0.198.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SIGHTENGINE_API_USER = Deno.env.get('SIGHTENGINE_API_USER') || '';
const SIGHTENGINE_API_SECRET = Deno.env.get('SIGHTENGINE_API_SECRET') || '';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Custom Arabic Profanity Dictionary (fallbacks that AI might miss)
const ARABIC_BAD_WORDS = [
    "كسمك", "كس امك", "قحبه", "قحبة", "شرموطه", "شرموطة", "عرص", "منيوك", "زب", "مخنث", "نيك"
];

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    try {
        const payload = await req.json();
        const record = payload.record || payload;

        const { id: message_id, sender_id: user_id, text } = record;

        if (!text || !user_id || !message_id) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        // --- Developer Test Hook ---
        if (text.includes("test_violation")) {
            await supabase
                .from('messages')
                .update({ text: '🚫 [تم حظر الرسالة وحظر المستخدم بواسطة الحماية التلقائية]', status: 'delivered' })
                .eq('id', message_id);

            await supabase.from('moderation_logs').insert({
                user_id,
                action_taken: 'banned',
                risk_category: 'test_auto_moderation',
                risk_score: 1.0,
                fingerprint: 'test_fingerprint',
                metadata: { text_filtered: text, model_response: "Manual test match" }
            });
            return new Response(JSON.stringify({ success: true, test_run: true }), { headers: { 'Content-Type': 'application/json' } });
        }
        // ----------------------------

        // 1. Local Arabic Filter Check
        const normalizedText = text.replace(/أ|إ|آ/g, 'ا').replace(/ة/g, 'ه').toLowerCase();
        let localViolation = false;

        for (const badWord of ARABIC_BAD_WORDS) {
            if (normalizedText.includes(badWord)) {
                localViolation = true;
                break;
            }
        }

        let violationReason = '';
        let apiData = null;

        if (localViolation) {
            violationReason = 'استخدام كلمات مسيئة واضحة (عبر الفلتر الداخلي)';
        } else {
            // 2. Fallback to AI (Sightengine)
            const formData = new FormData();
            formData.append('text', text);
            formData.append('lang', 'ar,en');
            formData.append('mode', 'rules,standard,profanity,personal');
            formData.append('api_user', SIGHTENGINE_API_USER);
            formData.append('api_secret', SIGHTENGINE_API_SECRET);

            const sightengineRes = await fetch('https://api.sightengine.com/1.0/text/check.json', {
                method: 'POST',
                body: formData
            });

            apiData = await sightengineRes.json();

            if (apiData.status === 'success') {
                const profanity = apiData.profanity?.matches?.length > 0;
                const personal = apiData.personal?.matches?.length > 0;
                const link = apiData.link?.matches?.length > 0;

                if (profanity) violationReason = 'استخدام كلمات مسيئة أو بذيئة';
                else if (link) violationReason = 'إرسال روابط مشبوهة أو احتيالية';
                else if (personal) violationReason = 'نشر معلومات شخصية';
            }
        }

        if (violationReason) {
            // 1. Modify message 
            const { error: updateError } = await supabase
                .from('messages')
                .update({ text: '🚫 [تم حظر الرسالة وحظر المستخدم بواسطة الحماية التلقائية]', status: 'delivered' })
                .eq('id', message_id);

            if (updateError) console.error("Update Error: ", updateError);

            // 2. Fetch Fingerprint
            const { data: lastLog } = await supabase
                .from('moderation_logs')
                .select('fingerprint, ip_address')
                .eq('user_id', user_id)
                .not('fingerprint', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            const fingerprint = lastLog?.fingerprint || 'unknown_from_text_chat';
            const ip_address = lastLog?.ip_address || null;

            await supabase.from('moderation_logs').insert({
                user_id,
                action_taken: 'banned',
                risk_category: violationReason,
                risk_score: 1.0,
                fingerprint,
                ip_address,
                metadata: { text_filtered: text, model_response: apiData || 'Local Filter' }
            });

            // 3. Global Ban
            await supabase.from('banned_users').insert({
                user_id: user_id,
                reason: 'Text Auto-moderation: ' + violationReason,
                banned_by: 'system',
                fingerprint,
                ip_address,
                is_active: true
            });
        }

        return new Response(JSON.stringify({ success: true, processed: true }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error("Function error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
