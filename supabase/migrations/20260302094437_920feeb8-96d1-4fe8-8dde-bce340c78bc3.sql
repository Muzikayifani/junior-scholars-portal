
-- Make message_threads SELECT policy PERMISSIVE
DROP POLICY IF EXISTS "Users can view threads they participate in" ON public.message_threads;
CREATE POLICY "Users can view threads they participate in"
  ON public.message_threads
  FOR SELECT
  TO authenticated
  USING (user_is_thread_participant(id));

-- Make thread_participants SELECT policy PERMISSIVE
DROP POLICY IF EXISTS "Users can view participants of their threads" ON public.thread_participants;
CREATE POLICY "Users can view participants of their threads"
  ON public.thread_participants
  FOR SELECT
  TO authenticated
  USING (user_is_thread_participant(thread_id));
