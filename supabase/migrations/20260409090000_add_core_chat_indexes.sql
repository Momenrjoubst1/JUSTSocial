-- Phase 1: Core performance indexes for chat-heavy queries.
-- NOTE: Use CONCURRENTLY to avoid long write locks on hot tables.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id
  ON public.messages (sender_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_receiver_id
  ON public.messages (receiver_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at
  ON public.messages (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation
  ON public.messages (sender_id, receiver_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at
  ON public.users (created_at DESC);
