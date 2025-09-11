-- Create storage policies for file uploads in posts and other content

-- Policy for profile-avatars bucket (already public, just need upload policies)
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create post-images bucket for post content
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for post-images bucket
CREATE POLICY "Anyone can view post images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'post-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own post images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own post images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create post-videos bucket for video content
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-videos', 'post-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for post-videos bucket
CREATE POLICY "Anyone can view post videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'post-videos');

CREATE POLICY "Authenticated users can upload post videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'post-videos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own post videos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'post-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own post videos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'post-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix existing buckets policies
-- Policies for group-files bucket
CREATE POLICY "Group members can view group files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'group-files' 
  AND EXISTS (
    SELECT 1 FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    JOIN profiles p ON gm.user_id = p.id
    WHERE p.user_id = auth.uid()
    AND g.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Group members can upload group files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'group-files' 
  AND EXISTS (
    SELECT 1 FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    JOIN profiles p ON gm.user_id = p.id
    WHERE p.user_id = auth.uid()
    AND g.id::text = (storage.foldername(name))[1]
  )
);

-- Policies for resources bucket
CREATE POLICY "Group members can view resources" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'resources' 
  AND EXISTS (
    SELECT 1 FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    JOIN profiles p ON gm.user_id = p.id
    WHERE p.user_id = auth.uid()
    AND g.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Group members can upload resources" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'resources' 
  AND EXISTS (
    SELECT 1 FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    JOIN profiles p ON gm.user_id = p.id
    WHERE p.user_id = auth.uid()
    AND g.id::text = (storage.foldername(name))[1]
  )
);