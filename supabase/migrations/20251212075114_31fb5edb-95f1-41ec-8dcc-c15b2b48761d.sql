-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Allow authenticated users to create threads" ON public.message_threads;

-- Create a proper PERMISSIVE INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create threads" 
ON public.message_threads 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also fix thread_participants INSERT policy if needed
DROP POLICY IF EXISTS "Allow authenticated users to add participants" ON public.thread_participants;

CREATE POLICY "Authenticated users can add participants" 
ON public.thread_participants 
FOR INSERT 
TO authenticated
WITH CHECK (true);