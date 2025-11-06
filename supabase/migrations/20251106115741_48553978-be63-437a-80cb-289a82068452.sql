-- Make message-files bucket public so images can be displayed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'message-files';

-- Also make group-files bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'group-files';