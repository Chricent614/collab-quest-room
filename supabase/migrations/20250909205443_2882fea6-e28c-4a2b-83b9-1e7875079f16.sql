-- Fix infinite recursion in group_members RLS policy
DROP POLICY IF EXISTS "Users can view group members" ON group_members;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Users can view group members" 
ON group_members 
FOR SELECT 
USING (
  -- Users can see members of groups they belong to
  group_id IN (
    SELECT gm.group_id 
    FROM group_members gm 
    INNER JOIN profiles p ON gm.user_id = p.id 
    WHERE p.user_id = auth.uid()
  )
  OR 
  -- Users can see members of public groups
  group_id IN (
    SELECT id FROM groups WHERE is_private = false
  )
);

-- Also fix the posts policy to avoid potential recursion
DROP POLICY IF EXISTS "Users can view posts" ON posts;

CREATE POLICY "Users can view posts" 
ON posts 
FOR SELECT 
USING (
  -- Public posts (no group)
  group_id IS NULL 
  OR 
  -- Posts in groups where user is a member
  group_id IN (
    SELECT gm.group_id 
    FROM group_members gm 
    INNER JOIN profiles p ON gm.user_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);