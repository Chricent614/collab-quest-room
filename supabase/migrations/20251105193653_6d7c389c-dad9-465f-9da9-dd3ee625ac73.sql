-- Drop the problematic trigger and function that requires pg_net
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;
DROP FUNCTION IF EXISTS public.send_push_notification();

-- We'll handle push notifications through the application layer instead
-- The edge function will be called directly from the app when needed