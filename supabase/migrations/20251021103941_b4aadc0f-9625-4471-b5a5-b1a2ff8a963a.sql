-- Create message reads tracking table for group messages
CREATE TABLE IF NOT EXISTS public.message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
ON public.message_reads
FOR INSERT
WITH CHECK (user_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Users can view read receipts for their group messages
CREATE POLICY "Users can view read receipts"
ON public.message_reads
FOR SELECT
USING (
  message_id IN (
    SELECT p.id FROM posts p
    WHERE p.group_id IN (
      SELECT group_id FROM get_user_group_memberships()
    )
  )
);

-- Add index for performance
CREATE INDEX idx_message_reads_message_id ON public.message_reads(message_id);
CREATE INDEX idx_message_reads_user_id ON public.message_reads(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;