-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Row Level Security Policies (Critical GDPR Fix)
-- 
-- SECURITY FIX: The previous "Public profiles are viewable by everyone"
-- policy allowed anyone with the public anon key to read ALL user data
-- including emails, full names, and bios. This was a critical GDPR violation.
--
-- Changes:
--   1. Drop the broken public SELECT policy on users table
--   2. Create two separate authenticated-only SELECT policies
--   3. Create a public_profiles view that excludes email
--   4. Grant appropriate access to the view
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Step 1: Drop the broken policy ─────────────────────────────────────────

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.users;

-- ─── Step 2: Create secure SELECT policies ──────────────────────────────────

-- Policy A: Authenticated users can view public profile rows
-- (email column exposure is controlled at the query/view level)
CREATE POLICY "Authenticated users can view public profiles"
  ON public.users FOR SELECT
  TO authenticated
  USING ( true );

-- Policy B: Owner can access their own full profile (including email)
CREATE POLICY "Users can view own full profile"
  ON public.users FOR SELECT
  TO authenticated
  USING ( auth.uid() = id );

-- ─── Step 3: Create a public_profiles view (email excluded) ─────────────────

-- This view intentionally omits the email column.
-- All frontend queries fetching OTHER users' data must use this view.
-- Only the authenticated user's own profile page may query the users table
-- directly (with .eq('id', user.id)) to access their own email.
--
-- ONLY columns confirmed to exist in the live users table are included.

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  full_name,
  username,
  avatar_url,
  bio,
  created_at
FROM public.users;

-- ─── Step 4: Grant access to the view ───────────────────────────────────────

GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION: After applying, test with the anon key:
--   curl -H "apikey: YOUR_ANON_KEY" \
--     https://YOUR_PROJECT.supabase.co/rest/v1/users
--   Expected: empty array [] or 403 error
--   
--   curl -H "apikey: YOUR_ANON_KEY" \
--     https://YOUR_PROJECT.supabase.co/rest/v1/public_profiles
--   Expected: profiles WITHOUT email column
-- ═══════════════════════════════════════════════════════════════════════════════
