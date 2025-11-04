-- Add import for React at the top
-- Add function to send push notifications when notification is created
CREATE OR REPLACE FUNCTION public.send_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_function_url TEXT;
BEGIN
  -- Get the Supabase function URL
  v_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push';
  
  -- Call the edge function asynchronously using pg_net
  PERFORM net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.message,
      'link', NEW.link,
      'type', NEW.type
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to send push notifications
CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_notification();