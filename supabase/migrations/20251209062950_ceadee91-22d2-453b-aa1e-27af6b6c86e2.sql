-- Allow learners to view threads they participate in (already handled by existing policy)
-- Allow learners to send messages to their threads (already handled by existing policy)
-- Allow learners to view their participants (already handled by existing policy)

-- Add policy for learners to view profiles of teachers who message them
CREATE POLICY "Learners can view thread participant profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM thread_participants tp1
    JOIN thread_participants tp2 ON tp1.thread_id = tp2.thread_id
    WHERE tp1.user_id = auth.uid()
    AND tp2.user_id = profiles.user_id
  )
);