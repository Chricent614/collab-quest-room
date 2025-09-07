-- Fix recursive RLS policy issue on group_members
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;

CREATE POLICY "Users can view group members" 
ON public.group_members 
FOR SELECT 
USING (
  -- Users can view members of groups they belong to
  group_id IN (
    SELECT gm.group_id 
    FROM group_members gm 
    JOIN profiles p ON gm.user_id = p.id 
    WHERE p.user_id = auth.uid()
  )
  OR
  -- Or if the group is public
  group_id IN (
    SELECT g.id 
    FROM groups g 
    WHERE g.is_private = false
  )
);

-- Add storage buckets for file sharing
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('group-files', 'group-files', false),
  ('profile-avatars', 'profile-avatars', true),
  ('resources', 'resources', false);

-- Storage policies for group files
CREATE POLICY "Users can upload to their groups" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'group-files' 
  AND (storage.foldername(name))[1] IN (
    SELECT g.id::text 
    FROM groups g 
    JOIN group_members gm ON g.id = gm.group_id 
    JOIN profiles p ON gm.user_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view group files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'group-files' 
  AND (storage.foldername(name))[1] IN (
    SELECT g.id::text 
    FROM groups g 
    JOIN group_members gm ON g.id = gm.group_id 
    JOIN profiles p ON gm.user_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

-- Profile avatar policies
CREATE POLICY "Users can upload their own avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'profile-avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profile-avatars');

-- Add tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view tasks" 
ON public.tasks 
FOR SELECT 
USING (
  group_id IN (
    SELECT g.id 
    FROM groups g 
    JOIN group_members gm ON g.id = gm.group_id 
    JOIN profiles p ON gm.user_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND group_id IN (
    SELECT g.id 
    FROM groups g 
    JOIN group_members gm ON g.id = gm.group_id 
    JOIN profiles p ON gm.user_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Task creators can update tasks" 
ON public.tasks 
FOR UPDATE 
USING (
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Add resources table
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  tags TEXT[],
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view resources" 
ON public.resources 
FOR SELECT 
USING (
  group_id IN (
    SELECT g.id 
    FROM groups g 
    JOIN group_members gm ON g.id = gm.group_id 
    JOIN profiles p ON gm.user_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can upload resources" 
ON public.resources 
FOR INSERT 
WITH CHECK (
  uploaded_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND group_id IN (
    SELECT g.id 
    FROM groups g 
    JOIN group_members gm ON g.id = gm.group_id 
    JOIN profiles p ON gm.user_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

-- Add peer reviews table
CREATE TABLE public.peer_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  submission_title TEXT NOT NULL,
  submission_content TEXT,
  submission_file_url TEXT,
  submitted_by UUID NOT NULL,
  reviewed_by UUID,
  review_content TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.peer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view peer reviews" 
ON public.peer_reviews 
FOR SELECT 
USING (
  group_id IN (
    SELECT g.id 
    FROM groups g 
    JOIN group_members gm ON g.id = gm.group_id 
    JOIN profiles p ON gm.user_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can submit for review" 
ON public.peer_reviews 
FOR INSERT 
WITH CHECK (
  submitted_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND group_id IN (
    SELECT g.id 
    FROM groups g 
    JOIN group_members gm ON g.id = gm.group_id 
    JOIN profiles p ON gm.user_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can review submissions" 
ON public.peer_reviews 
FOR UPDATE 
USING (
  group_id IN (
    SELECT g.id 
    FROM groups g 
    JOIN group_members gm ON g.id = gm.group_id 
    JOIN profiles p ON gm.user_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

-- Add user roles
ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'student' CHECK (role IN ('student', 'tutor', 'admin'));

-- Add triggers for timestamp updates
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
BEFORE UPDATE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_peer_reviews_updated_at
BEFORE UPDATE ON public.peer_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();