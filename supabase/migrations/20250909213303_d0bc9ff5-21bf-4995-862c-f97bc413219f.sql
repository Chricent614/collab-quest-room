-- Fix infinite recursion in storage policies and groups RLS
-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Users can view files in their groups" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to their groups" ON storage.objects;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_profile_id()
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  SELECT id INTO profile_id FROM public.profiles WHERE user_id = auth.uid();
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Fix groups policies using the security definer function
CREATE POLICY "Users can view all public groups" 
ON public.groups 
FOR SELECT 
USING (is_private = false OR created_by = public.get_user_profile_id());

CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (created_by = public.get_user_profile_id());

CREATE POLICY "Group creators can update their groups" 
ON public.groups 
FOR UPDATE 
USING (created_by = public.get_user_profile_id());

-- Fix storage policies for profile-avatars bucket
CREATE POLICY "Users can view all avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-avatars' 
  AND (storage.foldername(name))[1] = public.get_user_profile_id()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-avatars' 
  AND (storage.foldername(name))[1] = public.get_user_profile_id()::text
);

-- Fix storage policies for resources bucket
CREATE POLICY "Users can view resources"
ON storage.objects FOR SELECT
USING (bucket_id = 'resources');

CREATE POLICY "Users can upload resources"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resources');

CREATE POLICY "Users can update their uploaded resources"
ON storage.objects FOR UPDATE
USING (bucket_id = 'resources' AND owner_id = auth.uid());

-- Fix storage policies for group-files bucket
CREATE POLICY "Users can view group files"
ON storage.objects FOR SELECT
USING (bucket_id = 'group-files');

CREATE POLICY "Users can upload group files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'group-files');

CREATE POLICY "Users can update their uploaded group files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'group-files' AND owner_id = auth.uid());