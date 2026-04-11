-- Migration: Add trigger to automatically delete storage objects when media_attachments are deleted

CREATE OR REPLACE FUNCTION delete_media_storage_object()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete the corresponding object from storage.objects
    -- The bucket_id is 'chat_media' and the name matches the old storage_path
    DELETE FROM storage.objects
    WHERE bucket_id = 'chat_media' AND name = OLD.storage_path;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to allow re-runs
DROP TRIGGER IF EXISTS trigger_delete_media_storage_object ON public.media_attachments;

CREATE TRIGGER trigger_delete_media_storage_object
AFTER DELETE ON public.media_attachments
FOR EACH ROW EXECUTE FUNCTION delete_media_storage_object();
