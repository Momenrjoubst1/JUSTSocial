-- 1. Create blocked_words table
CREATE TABLE IF NOT EXISTS public.blocked_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT UNIQUE NOT NULL,
    severity INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.blocked_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on blocked_words" ON public.blocked_words FOR SELECT USING (true);

INSERT INTO public.blocked_words (word, severity) VALUES 
('كسمك', 3), ('كس امك', 3), ('قحبه', 3), ('قحبة', 3), ('شرموطه', 3), 
('شرموطة', 3), ('عرص', 2), ('منيوك', 3), ('زب', 2), ('مخنث', 2), ('نيك', 3)
ON CONFLICT (word) DO NOTHING;

-- 2. Create user_violations table
CREATE TABLE IF NOT EXISTS public.user_violations (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    violation_count INT DEFAULT 0,
    last_violated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on user_violations" ON public.user_violations FOR SELECT USING (true);


-- 3. Create the trigger function
CREATE OR REPLACE FUNCTION public.moderate_message_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_total_violations INT := 0;
    flag_severity INT := 0;
BEGIN
    -- Check if metadata contains a moderation flag
    IF NEW.metadata IS NOT NULL AND NEW.metadata->>'moderation_status' = 'flagged' THEN
        -- Get severity from metadata, defaulting to 1
        flag_severity := COALESCE((NEW.metadata->>'severity')::INT, 1);

        -- Upsert violation count
        INSERT INTO public.user_violations (user_id, violation_count, last_violated_at)
        VALUES (NEW.sender_id, flag_severity, now())
        ON CONFLICT (user_id) DO UPDATE 
        SET violation_count = public.user_violations.violation_count + flag_severity,
            last_violated_at = now()
        RETURNING violation_count INTO user_total_violations;

        -- Apply automatic ban if threshold met
        IF user_total_violations >= 3 OR flag_severity >= 3 THEN
            INSERT INTO public.banned_users (user_id, reason, banned_by, is_active)
            VALUES (
                NEW.sender_id, 
                'Server Auto-Moderation: Repeated Violations or High Severity', 
                'system_trigger', 
                true
            )
            ON CONFLICT (user_id) DO UPDATE 
            SET is_active = true, 
                reason = 'Server Auto-Moderation: Repeated Violations or High Severity';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.moderate_message_before_insert() IS 'Auto-moderates message based on Edge function flags in metadata.';

-- 4. Bind the Trigger
DROP TRIGGER IF EXISTS trg_moderate_message ON public.messages;

CREATE TRIGGER trg_moderate_message
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.moderate_message_before_insert();

COMMENT ON TRIGGER trg_moderate_message ON public.messages IS 'Applies server-side message moderation based on E2EE agnostic flags.';
