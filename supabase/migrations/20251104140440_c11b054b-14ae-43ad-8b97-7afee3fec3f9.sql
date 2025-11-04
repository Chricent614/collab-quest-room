-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Create push_subscriptions table for Web Push
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, subscription)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Trigger function for new messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_receiver_id UUID;
BEGIN
  -- Get sender name
  SELECT first_name || ' ' || last_name INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Get receiver profile id
  SELECT id INTO v_receiver_id
  FROM profiles
  WHERE id = NEW.receiver_id;
  
  -- Create notification
  PERFORM create_notification(
    v_receiver_id,
    'message',
    'New Message',
    v_sender_name || ' sent you a message',
    '/messages',
    jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.sender_id)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for private messages
CREATE TRIGGER on_private_message_created
  AFTER INSERT ON public.private_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- Trigger function for new comments
CREATE OR REPLACE FUNCTION public.notify_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commenter_name TEXT;
  v_post_author_id UUID;
BEGIN
  -- Get commenter name
  SELECT first_name || ' ' || last_name INTO v_commenter_name
  FROM profiles
  WHERE id = NEW.author_id;
  
  -- Get post author
  SELECT author_id INTO v_post_author_id
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if user comments on their own post
  IF v_post_author_id != NEW.author_id THEN
    PERFORM create_notification(
      v_post_author_id,
      'comment',
      'New Comment',
      v_commenter_name || ' commented on your post',
      '/dashboard',
      jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for comments
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_comment();

-- Trigger function for new reactions
CREATE OR REPLACE FUNCTION public.notify_new_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reactor_name TEXT;
  v_post_author_id UUID;
BEGIN
  -- Get reactor name
  SELECT first_name || ' ' || last_name INTO v_reactor_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Get post author
  SELECT author_id INTO v_post_author_id
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if user reacts to their own post
  IF v_post_author_id != NEW.user_id THEN
    PERFORM create_notification(
      v_post_author_id,
      'reaction',
      'New Reaction',
      v_reactor_name || ' reacted to your post',
      '/dashboard',
      jsonb_build_object('post_id', NEW.post_id, 'reaction_type', NEW.reaction_type)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for reactions
CREATE TRIGGER on_reaction_created
  AFTER INSERT ON public.post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_reaction();

-- Trigger function for friend requests
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_name TEXT;
BEGIN
  -- Only notify on new requests (status = 'pending')
  IF NEW.status = 'pending' THEN
    -- Get requester name
    SELECT first_name || ' ' || last_name INTO v_requester_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    PERFORM create_notification(
      NEW.friend_id,
      'friend_request',
      'New Friend Request',
      v_requester_name || ' sent you a friend request',
      '/find-friends',
      jsonb_build_object('friendship_id', NEW.id, 'requester_id', NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for friend requests
CREATE TRIGGER on_friend_request_created
  AFTER INSERT ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;