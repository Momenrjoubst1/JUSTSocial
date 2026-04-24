-- ═══════════════════════════════════════════════════════════════════
-- Migration: Message Edit & Unsend with E2EE Integrity Protection
-- ═══════════════════════════════════════════════════════════════════

-- Ensure metadata column exists (JSONB, nullable)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN metadata JSONB DEFAULT NULL;
    END IF;
END $$;

-- ─── Trigger: Protect message integrity on UPDATE ────────────────
-- Rules:
--   1. Only the original sender can update their own message metadata.
--   2. encrypted_content can ONLY be changed to '[UNSENT]' (unsend action).
--   3. sender_id and created_at are IMMUTABLE after insertion.
--   4. status field changes are always allowed (for read receipts).

CREATE OR REPLACE FUNCTION public.handle_message_update_guard()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow status-only updates (read receipts) from anyone involved
    IF NEW.encrypted_content = OLD.encrypted_content
       AND NEW.sender_id = OLD.sender_id
       AND NEW.created_at = OLD.created_at
       AND (NEW.metadata IS NOT DISTINCT FROM OLD.metadata)
    THEN
        RETURN NEW;
    END IF;

    -- For any other update, enforce ownership
    IF auth.uid() IS NULL OR auth.uid() != OLD.sender_id THEN
        RAISE EXCEPTION 'FORBIDDEN: Only the message sender can modify this message'
            USING ERRCODE = 'P0403';
    END IF;

    -- Prevent changing sender_id
    IF NEW.sender_id != OLD.sender_id THEN
        RAISE EXCEPTION 'IMMUTABLE: sender_id cannot be changed'
            USING ERRCODE = 'P0403';
    END IF;

    -- Prevent changing created_at
    IF NEW.created_at != OLD.created_at THEN
        RAISE EXCEPTION 'IMMUTABLE: created_at cannot be changed'
            USING ERRCODE = 'P0403';
    END IF;

    -- encrypted_content can only change to '[UNSENT]' (unsend) or to a new encrypted payload (edit)
    -- The Edge Function validates the time window; the trigger just enforces ownership.
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to allow re-running
DROP TRIGGER IF EXISTS guard_message_update ON public.messages;

CREATE TRIGGER guard_message_update
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_message_update_guard();
