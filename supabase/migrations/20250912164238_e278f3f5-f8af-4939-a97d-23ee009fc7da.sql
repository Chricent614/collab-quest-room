-- Storage RLS policies to handle file uploads safely and correctly
-- Ensures:
-- - Authenticated users can upload/update/delete their own files in public buckets: post-images, post-videos, profile-avatars
-- - Group members can upload/view files in private buckets: resources, group-files using group-id folder convention

-- Helper note: Policies are created idempotently using pg_policies checks

-- =========================
-- post-images (public)
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Users can upload to post-images in their folder'
  ) THEN
    CREATE POLICY "Users can upload to post-images in their folder"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'post-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Users can update their post-images'
  ) THEN
    CREATE POLICY "Users can update their post-images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'post-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Users can delete their post-images'
  ) THEN
    CREATE POLICY "Users can delete their post-images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'post-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- =========================
-- post-videos (public)
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Users can upload to post-videos in their folder'
  ) THEN
    CREATE POLICY "Users can upload to post-videos in their folder"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'post-videos'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Users can update their post-videos'
  ) THEN
    CREATE POLICY "Users can update their post-videos"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'post-videos'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Users can delete their post-videos'
  ) THEN
    CREATE POLICY "Users can delete their post-videos"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'post-videos'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- =========================
-- profile-avatars (public)
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Users can upload profile avatars in their folder'
  ) THEN
    CREATE POLICY "Users can upload profile avatars in their folder"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'profile-avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Users can update their profile avatars'
  ) THEN
    CREATE POLICY "Users can update their profile avatars"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'profile-avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Users can delete their profile avatars'
  ) THEN
    CREATE POLICY "Users can delete their profile avatars"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'profile-avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- =========================
-- resources (private) — group-based access using first folder = group_id
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Group members can upload to resources'
  ) THEN
    CREATE POLICY "Group members can upload to resources"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'resources'
      AND EXISTS (
        SELECT 1
        FROM public.groups g
        WHERE g.id::text = (storage.foldername(name))[1]
          AND public.is_member_of_group(g.id)
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Group members can view resources'
  ) THEN
    CREATE POLICY "Group members can view resources"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'resources'
      AND EXISTS (
        SELECT 1
        FROM public.groups g
        WHERE g.id::text = (storage.foldername(name))[1]
          AND public.is_member_of_group(g.id)
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Uploaders can modify their resources'
  ) THEN
    CREATE POLICY "Uploaders can modify their resources"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'resources' AND owner = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Uploaders can delete their resources'
  ) THEN
    CREATE POLICY "Uploaders can delete their resources"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'resources' AND owner = auth.uid()
    );
  END IF;
END $$;

-- =========================
-- group-files (private) — group-based access using first folder = group_id
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Group members can upload to group-files'
  ) THEN
    CREATE POLICY "Group members can upload to group-files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'group-files'
      AND EXISTS (
        SELECT 1
        FROM public.groups g
        WHERE g.id::text = (storage.foldername(name))[1]
          AND public.is_member_of_group(g.id)
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Group members can view group-files'
  ) THEN
    CREATE POLICY "Group members can view group-files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'group-files'
      AND EXISTS (
        SELECT 1
        FROM public.groups g
        WHERE g.id::text = (storage.foldername(name))[1]
          AND public.is_member_of_group(g.id)
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Uploaders can modify their group-files'
  ) THEN
    CREATE POLICY "Uploaders can modify their group-files"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'group-files' AND owner = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
      AND policyname = 'Uploaders can delete their group-files'
  ) THEN
    CREATE POLICY "Uploaders can delete their group-files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'group-files' AND owner = auth.uid()
    );
  END IF;
END $$;