-- Skill-Swap Supabase Database Setup

-- 1. Create a users table that extends the auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  skills_offered TEXT[],
  skills_wanted TEXT[],
  bio TEXT,
  university TEXT CHECK (university IS NULL OR university = 'جامعة العلوم والتكنلوجيا الادنية'),
  chat_hanger TEXT,
  social_links JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view public profile rows
-- (email column is hidden via the public_profiles view)
CREATE POLICY "Authenticated users can view public profiles"
  ON public.users FOR SELECT
  TO authenticated
  USING ( true );

-- Owner can access their own full profile (including email)
CREATE POLICY "Users can view own full profile"
  ON public.users FOR SELECT
  TO authenticated
  USING ( auth.uid() = id );

-- Public profiles view (email intentionally excluded)
-- All frontend queries for OTHER users' data must use this view.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id, full_name, username, avatar_url, bio, created_at
FROM public.users;

GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Allow users to update their own profile
CREATE POLICY "Users can insert their own profile."
  ON public.users FOR INSERT
  WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
  ON public.users FOR UPDATE
  USING ( auth.uid() = id );

-- Optional: Create a trigger to automatically create a user profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, username, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Select: users can read messages they sent or received
CREATE POLICY "Users can read their own messages"
  ON public.messages FOR SELECT
  USING ( auth.uid() = sender_id OR auth.uid() = receiver_id );

-- Insert: users can only send messages FROM themselves
CREATE POLICY "Users can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK ( auth.uid() = sender_id );

-- Update: users can update the status of messages they *received* (e.g. mark as read)
CREATE POLICY "Users can update received messages"
  ON public.messages FOR UPDATE
  USING ( auth.uid() = receiver_id );

-- Delete: users can delete messages they sent or received
CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING ( auth.uid() = sender_id OR auth.uid() = receiver_id );

-- Enable Realtime for the messages table
-- This allows subscriptions in the frontend to work
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.users;
