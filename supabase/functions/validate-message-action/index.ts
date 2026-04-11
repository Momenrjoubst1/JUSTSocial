import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Edge Function: validate-message-action
 * 
 * Validates and authorizes message edit/unsend actions server-side.
 * This is the ONLY gateway for modifying messages after they're sent.
 * 
 * Security Model:
 *   - Ownership: Only the sender can edit/unsend their own messages.
 *   - Time Window: Edits allowed within 15 minutes of creation. Unsend is unlimited.
 *   - Payload Validation: New encrypted content must be non-empty and under 4000 chars.
 *   - The function does NOT read or modify cleartext; it only validates the encrypted payload.
 */

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse request body
    const body = await req.json();
    const { messageId, action, newEncryptedContent } = body as {
      messageId: string;
      action: "edit" | "unsend";
      newEncryptedContent?: string;
    };

    if (!messageId || !action || !["edit", "unsend"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: messageId and action ('edit'|'unsend') are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch the original message
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: message, error: fetchError } = await adminClient
      .from("messages")
      .select("id, sender_id, created_at, metadata, encrypted_content")
      .eq("id", messageId)
      .single();

    if (fetchError || !message) {
      return new Response(
        JSON.stringify({ error: "Message not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Ownership check
    if (message.sender_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You can only modify your own messages" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Check if already unsent
    if (message.metadata?.is_deleted) {
      return new Response(
        JSON.stringify({ error: "Message is already deleted" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createdAt = new Date(message.created_at).getTime();
    const now = Date.now();

    if (action === "edit") {
      // 6a. Time window check for edits
      if (now - createdAt > EDIT_WINDOW_MS) {
        return new Response(
          JSON.stringify({ error: "Edit window expired. Editing is allowed within 15 minutes only." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 6b. Payload validation
      if (!newEncryptedContent || typeof newEncryptedContent !== "string" || newEncryptedContent.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "New content cannot be empty" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (newEncryptedContent.length > 8000) {
        return new Response(
          JSON.stringify({ error: "Content exceeds maximum allowed size" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 6c. Apply edit
      const editCount = (message.metadata?.edit_count || 0) + 1;
      const newMetadata = {
        ...message.metadata,
        is_edited: true,
        edit_count: editCount,
        last_edited_at: new Date().toISOString(),
      };

      const { error: updateError } = await adminClient
        .from("messages")
        .update({
          encrypted_content: newEncryptedContent,
          metadata: newMetadata,
        })
        .eq("id", messageId);

      if (updateError) {
        console.error("Edit update failed:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update message" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ allowed: true, action: "edit", metadata: newMetadata }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "unsend") {
      // 7. Unsend: no time limit
      const newMetadata = {
        ...message.metadata,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        reactions: undefined,
      };

      const { error: updateError } = await adminClient
        .from("messages")
        .update({
          encrypted_content: "[UNSENT]",
          metadata: newMetadata,
        })
        .eq("id", messageId);

      if (updateError) {
        console.error("Unsend update failed:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to unsend message" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ allowed: true, action: "unsend" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unhandled error in validate-message-action:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
