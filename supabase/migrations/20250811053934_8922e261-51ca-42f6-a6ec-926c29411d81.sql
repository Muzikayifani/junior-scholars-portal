-- Phase 2 DB: submissions, messaging, and policies
-- 1) Results enhancements for submissions
ALTER TABLE public.results
ADD COLUMN IF NOT EXISTS submission_path TEXT;

-- Ensure one result per learner per assessment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'results_assessment_learner_uniq'
  ) THEN
    CREATE UNIQUE INDEX results_assessment_learner_uniq ON public.results (assessment_id, learner_id);
  END IF;
END $$;

-- Allow learners to insert/update their own result rows (for submissions)
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'results' AND policyname = 'Learners can insert their own results'
  ) THEN
    CREATE POLICY "Learners can insert their own results"
    ON public.results
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.learners l
        JOIN public.profiles p ON p.id = l.profile_id
        WHERE l.id = results.learner_id AND p.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'results' AND policyname = 'Learners can update their own results'
  ) THEN
    CREATE POLICY "Learners can update their own results"
    ON public.results
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.learners l
        JOIN public.profiles p ON p.id = l.profile_id
        WHERE l.id = results.learner_id AND p.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.learners l
        JOIN public.profiles p ON p.id = l.profile_id
        WHERE l.id = results.learner_id AND p.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 2) Storage bucket for submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for submissions bucket
DO $$
BEGIN
  -- Allow owners to upload to their own folder (first path segment is user_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Learners can upload their submissions'
  ) THEN
    CREATE POLICY "Learners can upload their submissions"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'submissions'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Allow owners to read their own files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owners can read their submissions'
  ) THEN
    CREATE POLICY "Owners can read their submissions"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'submissions'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Allow teachers to read files referenced by results for their assessments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Teachers can read submissions for their assessments'
  ) THEN
    CREATE POLICY "Teachers can read submissions for their assessments"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'submissions'
      AND EXISTS (
        SELECT 1
        FROM public.results r
        JOIN public.assessments a ON a.id = r.assessment_id
        JOIN public.profiles pt ON pt.id = a.teacher_id
        WHERE r.submission_path = storage.objects.name
          AND pt.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 3) Messaging system
-- Threads table
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Participants
CREATE TABLE IF NOT EXISTS public.thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (thread_id, profile_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies: Only participants can view threads/messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'message_threads' AND policyname = 'Participants can view threads'
  ) THEN
    CREATE POLICY "Participants can view threads"
    ON public.message_threads
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.thread_participants tp
        JOIN public.profiles p ON p.id = tp.profile_id
        WHERE tp.thread_id = message_threads.id AND p.user_id = auth.uid()
      )
    );
  END IF;

  -- Allow authenticated users to create threads
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'message_threads' AND policyname = 'Authenticated can create threads'
  ) THEN
    CREATE POLICY "Authenticated can create threads"
    ON public.message_threads
    FOR INSERT TO authenticated
    WITH CHECK (true);
  END IF;

  -- Allow participants to update thread metadata
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'message_threads' AND policyname = 'Participants can update threads'
  ) THEN
    CREATE POLICY "Participants can update threads"
    ON public.message_threads
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.thread_participants tp
        JOIN public.profiles p ON p.id = tp.profile_id
        WHERE tp.thread_id = message_threads.id AND p.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.thread_participants tp
        JOIN public.profiles p ON p.id = tp.profile_id
        WHERE tp.thread_id = message_threads.id AND p.user_id = auth.uid()
      )
    );
  END IF;

  -- Participants table policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'thread_participants' AND policyname = 'View participants of my threads'
  ) THEN
    CREATE POLICY "View participants of my threads"
    ON public.thread_participants
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.thread_participants tp2
        JOIN public.profiles p ON p.id = tp2.profile_id
        WHERE tp2.thread_id = thread_participants.thread_id AND p.user_id = auth.uid()
      )
    );
  END IF;

  -- Allow user to add themselves as participant, or teachers can add anyone
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'thread_participants' AND policyname = 'Add participants (self or teacher)'
  ) THEN
    CREATE POLICY "Add participants (self or teacher)"
    ON public.thread_participants
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = thread_participants.profile_id AND p.user_id = auth.uid()
      )
      OR public.is_teacher(auth.uid())
    );
  END IF;

  -- Messages policies: only participants can view and send, and sender must be self
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Participants can view messages'
  ) THEN
    CREATE POLICY "Participants can view messages"
    ON public.messages
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.thread_participants tp
        JOIN public.profiles p ON p.id = tp.profile_id
        WHERE tp.thread_id = messages.thread_id AND p.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Participants can send messages (as self)'
  ) THEN
    CREATE POLICY "Participants can send messages (as self)"
    ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.thread_participants tp
        JOIN public.profiles p ON p.id = tp.profile_id
        WHERE tp.thread_id = messages.thread_id AND p.user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles p2
        WHERE p2.id = messages.sender_profile_id AND p2.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Trigger to bump thread timestamps when messages are inserted
CREATE OR REPLACE FUNCTION public.bump_thread_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.message_threads
  SET updated_at = now(), last_message_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messages_bump_thread ON public.messages;
CREATE TRIGGER trg_messages_bump_thread
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_thread_timestamps();
