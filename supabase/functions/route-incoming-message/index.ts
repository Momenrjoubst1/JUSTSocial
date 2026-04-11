import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
    // 1. Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 2. Setup Admin Client
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        });

        // 3. Verify Auth
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing Auth header" }), { 
                status: 401, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }
        
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid token" }), { 
                status: 401, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }

        // 4. Parse payload
        const { receiverId } = await req.json();
        
        if (!receiverId) {
            return new Response(JSON.stringify({ error: "Missing receiverId" }), { 
                status: 400, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }

        // 5. Check if they follow each other (either direction gives an 'active' chat)
        // Adjust based on if your app requires mutual following or just one-way.
        // Assuming one-way following (if A follows B or B follows A) is enough to active.
        const { data: follows, error: followError } = await supabase
            .from("follows")
            .select("*")
            .or(`and(follower_id.eq.${user.id},following_id.eq.${receiverId}),and(follower_id.eq.${receiverId},following_id.eq.${user.id})`)
            .limit(1);

        if (followError) {
            console.error("Follow check error:", followError);
        }

        const isConnected = follows && follows.length > 0;
        
        return new Response(
            JSON.stringify({ status: isConnected ? "active" : "pending" }),
            { 
                status: 200, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
        );

    } catch (err) {
        console.error("Unexpected error:", err);
        return new Response(
            JSON.stringify({ error: "Internal Server Error" }),
            { 
                status: 500, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
        );
    }
});
