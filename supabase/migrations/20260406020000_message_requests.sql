-- Up migration
-- Instead of modifying the core 'status' delivery column which is used for 'sent'/'delivered'/'read',
-- we create an index on the metadata field 'message_status' to allow efficient querying of pending message requests.
CREATE INDEX IF NOT EXISTS idx_messages_metadata_status ON messages ((metadata->>'message_status'), conversation_id);
