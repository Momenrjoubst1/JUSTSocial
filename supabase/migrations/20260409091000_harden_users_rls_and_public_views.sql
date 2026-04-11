-- Phase 3: Harden RLS on users and expose only safe public profile fields.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Remove permissive/broken SELECT policies.
DROP POLICY IF EXISTS "Public users are viewable by everyone." ON public.users;
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view public profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view own full profile" ON public.users;

-- Normalize write policies so only owner updates; inserts are trigger-driven.
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile." ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Public-only profile view for showing other users safely (no email).
CREATE OR REPLACE VIEW public.user_public_profiles AS
SELECT
  id,
  full_name,
  username,
  avatar_url,
  bio,
  university,
  social_links,
  chat_hanger,
  created_at
FROM public.users;

-- Backward-compat view name used across the frontend.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  full_name,
  username,
  avatar_url,
  bio,
  university,
  social_links,
  chat_hanger,
  created_at
FROM public.user_public_profiles;

GRANT SELECT ON public.user_public_profiles TO anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Ensure anon role cannot read the raw users table directly.
REVOKE ALL ON public.users FROM anon;
GRANT SELECT, UPDATE ON public.users TO authenticated;
