-- Drop the existing policy that only allows user_id to manage friendships
DROP POLICY IF EXISTS "Users can manage their friendships" ON public.friends;

-- Create policy for initiators to manage their friend requests
CREATE POLICY "Users can manage sent friend requests"
ON public.friends
FOR ALL
USING (
  user_id IN (
    SELECT profiles.id FROM public.profiles WHERE profiles.user_id = auth.uid()
  )
);

-- Create policy for receivers to accept friend requests
CREATE POLICY "Users can accept received friend requests"
ON public.friends
FOR UPDATE
USING (
  friend_id IN (
    SELECT profiles.id FROM public.profiles WHERE profiles.user_id = auth.uid()
  )
);

-- Keep the viewing policy
DROP POLICY IF EXISTS "Users can view their friends" ON public.friends;

CREATE POLICY "Users can view their friendships"
ON public.friends
FOR SELECT
USING (
  (user_id IN (
    SELECT profiles.id FROM public.profiles WHERE profiles.user_id = auth.uid()
  )) 
  OR 
  (friend_id IN (
    SELECT profiles.id FROM public.profiles WHERE profiles.user_id = auth.uid()
  ))
);