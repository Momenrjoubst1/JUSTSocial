-- Full Skill-Swap Supabase Database Schema (Aligned with Backend Code)
-- Run this in Supabase SQL Editor to fix schema drift

-- 1. Users table (existing + safe recreate)
DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  skills_offered TEXT[],
  skills_wanted TEXT[],
  bio TEXT,
  university TEXT CHECK (university IS NULL OR university = 'جامعة العلوم والتكنولوجيا الأدنية'),
  chat_hanger TEXT,
  social_links JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- RLS & Policies (unchanged)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view public profiles" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view own full profile" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Public profiles view
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, full_name, username, avatar_url, bio, created_at FROM public.users;
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- New user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, username, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Conversations (Group + DM support)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_group BOOLEAN DEFAULT false NOT NULL,
  name TEXT,  -- Group name
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Policies for conversations
CREATE POLICY "Users can view conversations they're in" ON public.conversations FOR SELECT 
  TO authenticated USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid()));

CREATE POLICY "Users can insert conversations" ON public.conversations FOR INSERT 
  TO authenticated WITH CHECK (true);  -- Participants added separately

-- 3. Conversation Participants
CREATE TABLE public.conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their participants" ON public.conversation_participants FOR SELECT 
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert participants" ON public.conversation_participants FOR INSERT 
  TO authenticated WITH CHECK (user_id = auth.uid());

-- 4. Full Messages Table (matching backend service)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,  -- or encrypted_content based on app
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system')),
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  media_id UUID,  -- FK to media_attachments if exists
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages RLS
CREATE POLICY "Users can read conversation messages" ON public.messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()));
CREATE POLICY "Users can insert messages in their conversations" ON public.messages FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()));
CREATE POLICY "Users can update message status" ON public.messages FOR UPDATE 
  USING (sender_id = auth.uid() OR EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()));

-- Soft delete support
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_by_users UUID[] DEFAULT ARRAY[]::UUID[];
CREATE INDEX IF NOT EXISTS idx_messages_deleted_by_users ON public.messages USING GIN (deleted_by_users);

-- 5. Realtime Publications
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.users, public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users, public.messages, public.conversations, public.conversation_participants;

-- RPC for direct conversation lookup (used in optimized service)
CREATE OR REPLACE FUNCTION get_direct_conversation(target_user UUID)
RETURNS UUID AS $$
  SELECT cp1.conversation_id
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = target_user
    AND cp1.conversation_id IS NOT NULL
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conv_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- Verify setup
SELECT 'Schema updated successfully' AS status;
SELECT COUNT(*) AS user_count FROM public.users;
SELECT COUNT(*) AS conv_count FROM public.conversations;


