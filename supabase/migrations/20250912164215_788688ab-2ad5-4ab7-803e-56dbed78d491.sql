-- Fix remaining function security issue
-- Update handle_new_user function to have proper search_path

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );
  
  INSERT INTO public.user_settings (user_id)
  SELECT id FROM public.profiles WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$function$;