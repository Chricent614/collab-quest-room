-- Allow group members to download files from the private 'resources' bucket
-- Uses folder convention: name = '<group_id>/<filename>'

-- Safety: replace existing policy if present
DROP POLICY IF EXISTS "Group members can read resources" ON storage.objects;

CREATE POLICY "Group members can read resources"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'resources'
  AND public.is_member_of_group((storage.foldername(name))[1]::uuid)
);
