
-- Fix message_threads INSERT policy: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can create threads" ON public.message_threads;
CREATE POLICY "Authenticated users can create threads"
  ON public.message_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix thread_participants INSERT policy: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.thread_participants;
CREATE POLICY "Authenticated users can add participants"
  ON public.thread_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
