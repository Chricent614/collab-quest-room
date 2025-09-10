-- 1) Helper functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_profile_id()
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  SELECT id INTO profile_id FROM public.profiles WHERE user_id = auth.uid();
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_member_of_group(group_uuid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    JOIN public.profiles p ON gm.user_id = p.id
    WHERE gm.group_id = group_uuid
      AND p.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin_of_group(group_uuid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    JOIN public.profiles p ON gm.user_id = p.id
    WHERE gm.group_id = group_uuid
      AND p.user_id = auth.uid()
      AND gm.role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 2) Update groups policies to use helper functions
DROP POLICY IF EXISTS "Group admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view public groups or groups they're members of" ON public.groups;

CREATE POLICY "Group admins can update groups"
ON public.groups
FOR UPDATE
USING (public.is_admin_of_group(id));

CREATE POLICY "Users can view groups"
ON public.groups
FOR SELECT
USING ((NOT is_private) OR public.is_member_of_group(id) OR created_by = public.get_user_profile_id());

-- 3) Update group_members SELECT policy to avoid referencing groups
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
CREATE POLICY "Users can view group members"
ON public.group_members
FOR SELECT
USING (group_id IN (SELECT group_id FROM public.get_user_group_memberships()));