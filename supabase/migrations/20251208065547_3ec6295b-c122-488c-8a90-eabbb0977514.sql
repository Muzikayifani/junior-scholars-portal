-- Create message_threads table
CREATE TABLE public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create thread_participants table
CREATE TABLE public.thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is participant in thread
CREATE OR REPLACE FUNCTION public.user_is_thread_participant(target_thread_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thread_participants
    WHERE thread_id = target_thread_id
    AND user_id = auth.uid()
  );
$$;

-- RLS for message_threads: users can only see threads they participate in
CREATE POLICY "Users can view threads they participate in"
ON public.message_threads
FOR SELECT
USING (user_is_thread_participant(id));

CREATE POLICY "Authenticated users can create threads"
ON public.message_threads
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS for thread_participants
CREATE POLICY "Users can view participants of their threads"
ON public.thread_participants
FOR SELECT
USING (user_is_thread_participant(thread_id));

CREATE POLICY "Users can add participants to threads they're in"
ON public.thread_participants
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS for messages
CREATE POLICY "Users can view messages in their threads"
ON public.messages
FOR SELECT
USING (user_is_thread_participant(thread_id));

CREATE POLICY "Users can send messages to their threads"
ON public.messages
FOR INSERT
WITH CHECK (user_is_thread_participant(thread_id) AND sender_user_id = auth.uid());

-- Trigger to update last_message_at on new message
CREATE OR REPLACE FUNCTION public.update_thread_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.message_threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_thread_last_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_thread_last_message();