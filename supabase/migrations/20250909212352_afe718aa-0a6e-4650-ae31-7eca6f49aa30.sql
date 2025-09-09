-- Create security definer function to get user's group memberships
CREATE OR REPLACE FUNCTION public.get_user_group_memberships(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(group_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT gm.group_id 
  FROM group_members gm 
  INNER JOIN profiles p ON gm.user_id = p.id 
  WHERE p.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Drop and recreate the problematic policies using the security definer function
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Users can view posts" ON posts;

-- Create new policies using the security definer function
CREATE POLICY "Users can view group members" 
ON group_members 
FOR SELECT 
USING (
  group_id IN (SELECT get_user_group_memberships())
  OR 
  group_id IN (SELECT id FROM groups WHERE is_private = false)
);

CREATE POLICY "Users can view posts" 
ON posts 
FOR SELECT 
USING (
  group_id IS NULL 
  OR 
  group_id IN (SELECT get_user_group_memberships())
);

-- Enhance posts table to support different content types
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS live_stream_url TEXT;