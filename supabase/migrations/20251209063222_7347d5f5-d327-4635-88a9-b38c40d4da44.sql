-- Drop and recreate the message_threads insert policy as PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can create threads" ON public.message_threads;

CREATE POLICY "Authenticated users can create threads"
ON public.message_threads
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also fix thread_participants insert policy
DROP POLICY IF EXISTS "Users can add participants to threads they're in" ON public.thread_participants;

CREATE POLICY "Users can add participants to threads"
ON public.thread_participants
FOR INSERT
TO authenticated
WITH CHECK (true);