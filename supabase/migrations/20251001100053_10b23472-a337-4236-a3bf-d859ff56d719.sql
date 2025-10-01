-- Update the handle_new_user function to sync email_verified from auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    user_id, 
    first_name, 
    last_name, 
    email,
    phone,
    school,
    email_verified,
    phone_verified
  )
  VALUES (
    gen_random_uuid(),
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.email, ''),
    COALESCE(new.phone, new.raw_user_meta_data->>'phone'),
    COALESCE(new.raw_user_meta_data->>'school', ''),
    COALESCE((new.raw_user_meta_data->>'email_verified')::boolean, new.email_confirmed_at IS NOT NULL, false),
    COALESCE((new.raw_user_meta_data->>'phone_verified')::boolean, new.phone_confirmed_at IS NOT NULL, false)
  );
  RETURN new;
END;
$$;

-- Create a function to sync email_verified status for existing users
CREATE OR REPLACE FUNCTION sync_profile_email_verified()
RETURNS void
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
BEGIN
  -- Update profiles to sync email_verified from auth.users
  UPDATE public.profiles p
  SET email_verified = (
    SELECT COALESCE(
      (au.raw_user_meta_data->>'email_verified')::boolean,
      au.email_confirmed_at IS NOT NULL,
      false
    )
    FROM auth.users au
    WHERE au.id = p.user_id
  )
  WHERE EXISTS (
    SELECT 1 
    FROM auth.users au 
    WHERE au.id = p.user_id
  );
END;
$$;

-- Run the sync function to update existing profiles
SELECT sync_profile_email_verified();