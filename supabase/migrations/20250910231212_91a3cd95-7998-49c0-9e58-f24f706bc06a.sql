-- Drop all existing policies that may cause conflicts
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view all public groups" ON public.groups;

-- Now recreate the groups policies correctly
CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (created_by = public.get_user_profile_id());

CREATE POLICY "Group creators can update their groups" 
ON public.groups 
FOR UPDATE 
USING (created_by = public.get_user_profile_id());

CREATE POLICY "Users can view all public groups" 
ON public.groups 
FOR SELECT 
USING (is_private = false OR created_by = public.get_user_profile_id());