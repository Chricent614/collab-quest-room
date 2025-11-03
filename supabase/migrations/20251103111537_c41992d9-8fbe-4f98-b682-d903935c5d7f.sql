-- Create storage bucket for message files
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-files', 'message-files', false);

-- Add file_url and file_name columns to private_messages
ALTER TABLE private_messages
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Create policies for message files bucket
CREATE POLICY "Users can upload their own message files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view message files in their conversations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own message files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);