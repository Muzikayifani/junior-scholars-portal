-- Allow users to update read_at on messages in threads they participate in
CREATE POLICY "Users can mark messages as read in their threads"
ON public.messages
FOR UPDATE
TO authenticated
USING (user_is_thread_participant(thread_id))
WITH CHECK (user_is_thread_participant(thread_id));