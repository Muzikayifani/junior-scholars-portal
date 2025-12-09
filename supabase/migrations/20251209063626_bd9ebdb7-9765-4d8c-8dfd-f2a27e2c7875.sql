-- Drop ALL existing insert policies on message_threads
DROP POLICY IF EXISTS "Authenticated users can create threads" ON public.message_threads;

-- Create a proper PERMISSIVE insert policy
CREATE POLICY "Allow authenticated users to create threads"
ON public.message_threads
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Drop ALL existing insert policies on thread_participants
DROP POLICY IF EXISTS "Users can add participants to threads" ON public.thread_participants;
DROP POLICY IF EXISTS "Users can add participants to threads they're in" ON public.thread_participants;

-- Create a proper PERMISSIVE insert policy for thread_participants
CREATE POLICY "Allow authenticated users to add participants"
ON public.thread_participants
FOR INSERT
TO authenticated
WITH CHECK (true);