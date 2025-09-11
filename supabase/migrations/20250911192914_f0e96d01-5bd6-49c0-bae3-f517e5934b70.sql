-- Fix storage policies for uploads

-- Drop conflicting policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post videos" ON storage.objects;
DROP POLICY IF EXISTS "Group members can upload group files" ON storage.objects;
DROP POLICY IF EXISTS "Group members can upload resources" ON storage.objects;

-- Create correct storage policies for file uploads
CREATE POLICY "Users can upload post images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'post-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload post videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'post-videos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Group file upload policy - allow group members to upload
CREATE POLICY "Group members can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'group-files' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM group_members gm
    JOIN profiles p ON gm.user_id = p.id
    WHERE p.user_id = auth.uid()
    AND gm.group_id::text = (storage.foldername(name))[1]
  )
);

-- Resource upload policy - allow group members to upload
CREATE POLICY "Group members can upload resources" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'resources' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM group_members gm
    JOIN profiles p ON gm.user_id = p.id
    WHERE p.user_id = auth.uid()
    AND gm.group_id::text = (storage.foldername(name))[1]
  )
);

-- Enable file upload for peer reviews
CREATE POLICY "Users can upload peer review files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'group-files' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);