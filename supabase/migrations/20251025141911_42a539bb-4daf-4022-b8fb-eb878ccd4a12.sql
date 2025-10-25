-- Add WhatsApp-style notification settings and wallpaper to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS message_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS group_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS like_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS comment_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS wallpaper_url TEXT;