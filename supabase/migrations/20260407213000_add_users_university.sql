ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS university TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_university_allowed_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_university_allowed_check
      CHECK (
        university IS NULL OR university = 'جامعة العلوم والتكنلوجيا الادنية'
      );
  END IF;
END $$;
