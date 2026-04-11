-- Create media_attachments table
CREATE TABLE IF NOT EXISTS public.media_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    file_size INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast retrieval
CREATE INDEX IF NOT EXISTS idx_media_conv ON public.media_attachments(message_id);

-- Enable RLS
ALTER TABLE public.media_attachments ENABLE ROW LEVEL SECURITY;

-- Select Policy for media_attachments
CREATE POLICY "Users can view media in their conversations" ON public.media_attachments 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
        WHERE m.id = media_attachments.message_id
        AND cp.user_id = auth.uid()
    )
);

-- Note: Insert into media_attachments is typically done via trigger or Server/Edge Function, 
-- but if we do it from client, we need an INSERT policy
CREATE POLICY "Users can insert media attachments" ON public.media_attachments 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
        WHERE m.id = media_attachments.message_id
        AND cp.user_id = auth.uid()
    )
);

-- Setup Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_media', 'chat_media', false) 
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- 1. Insert Policy
CREATE POLICY "Users can upload media to their conversations" ON storage.objects 
FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'chat_media' AND 
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id::text = (string_to_array(name, '/'))[1] 
        AND user_id = auth.uid()
    )
);

-- 2. Select Policy
CREATE POLICY "Users can view media in their conversations" ON storage.objects 
FOR SELECT TO authenticated USING (
    bucket_id = 'chat_media' AND 
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id::text = (string_to_array(name, '/'))[1] 
        AND user_id = auth.uid()
    )
);
