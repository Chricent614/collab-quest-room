-- Fix function security by setting proper search_path
-- This addresses the function search path security warning

-- Update get_user_group_memberships function
CREATE OR REPLACE FUNCTION public.get_user_group_memberships(user_uuid uuid DEFAULT auth.uid())
 RETURNS TABLE(group_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT gm.group_id 
  FROM group_members gm 
  INNER JOIN profiles p ON gm.user_id = p.id 
  WHERE p.user_id = user_uuid;
END;
$function$;

-- Update get_user_profile_id function
CREATE OR REPLACE FUNCTION public.get_user_profile_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  profile_id UUID;
BEGIN
  SELECT id INTO profile_id FROM public.profiles WHERE user_id = auth.uid();
  RETURN profile_id;
END;
$function$;

-- Update is_member_of_group function
CREATE OR REPLACE FUNCTION public.is_member_of_group(group_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    JOIN public.profiles p ON gm.user_id = p.id
    WHERE gm.group_id = group_uuid
      AND p.user_id = auth.uid()
  );
$function$;

-- Update is_admin_of_group function
CREATE OR REPLACE FUNCTION public.is_admin_of_group(group_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    JOIN public.profiles p ON gm.user_id = p.id
    WHERE gm.group_id = group_uuid
      AND p.user_id = auth.uid()
      AND gm.role = 'admin'
  );
$function$;