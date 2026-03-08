
-- Parent-Teacher Meetings table
CREATE TABLE public.meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_user_id uuid NOT NULL,
  teacher_user_id uuid NOT NULL,
  child_user_id uuid NOT NULL,
  subject text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  scheduled_date date,
  scheduled_time time,
  duration_minutes integer DEFAULT 30,
  teacher_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Fee tracking table
CREATE TABLE public.fees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learner_user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  amount numeric(10,2) NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'unpaid',
  paid_at timestamp with time zone,
  payment_reference text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for meetings
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view their own meetings"
  ON public.meetings FOR SELECT
  USING (parent_user_id = auth.uid());

CREATE POLICY "Parents can create meeting requests"
  ON public.meetings FOR INSERT
  WITH CHECK (parent_user_id = auth.uid());

CREATE POLICY "Teachers can view meetings for them"
  ON public.meetings FOR SELECT
  USING (teacher_user_id = auth.uid());

CREATE POLICY "Teachers can update their meetings"
  ON public.meetings FOR UPDATE
  USING (teacher_user_id = auth.uid());

-- RLS for fees
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view fees for their children"
  ON public.fees FOR SELECT
  USING (learner_user_id IN (SELECT child_user_id FROM get_user_children()));

CREATE POLICY "Teachers can manage fees"
  ON public.fees FOR ALL
  USING (is_teacher())
  WITH CHECK (is_teacher());

-- Triggers for updated_at
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fees_updated_at
  BEFORE UPDATE ON public.fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
