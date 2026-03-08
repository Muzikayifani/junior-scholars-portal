-- 1. Attendance tracking table
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes text,
  marked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_id, learner_id, date)
);

-- RLS for attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Teachers can manage attendance for their classes
CREATE POLICY "Teachers can manage attendance for their classes"
ON public.attendance FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM classes c WHERE c.id = attendance.class_id AND c.teacher_id = auth.uid()
));

-- Learners can view their own attendance
CREATE POLICY "Learners can view their own attendance"
ON public.attendance FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM learners l WHERE l.id = attendance.learner_id AND l.user_id = auth.uid()
));

-- Parents can view their children's attendance
CREATE POLICY "Parents can view children attendance"
ON public.attendance FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM learners l
  WHERE l.id = attendance.learner_id
  AND l.user_id IN (SELECT child_user_id FROM get_user_children())
));

-- 2. Announcements table
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own announcements
CREATE POLICY "Teachers can manage their announcements"
ON public.announcements FOR ALL TO authenticated
USING (teacher_id = auth.uid());

-- Learners can view published announcements for their classes
CREATE POLICY "Learners can view class announcements"
ON public.announcements FOR SELECT TO authenticated
USING (
  is_published = true AND (
    class_id IS NULL OR
    EXISTS (
      SELECT 1 FROM learners l WHERE l.class_id = announcements.class_id AND l.user_id = auth.uid()
    )
  )
);

-- Parents can view published announcements for their children's classes
CREATE POLICY "Parents can view children class announcements"
ON public.announcements FOR SELECT TO authenticated
USING (
  is_published = true AND (
    class_id IS NULL OR
    EXISTS (
      SELECT 1 FROM learners l
      WHERE l.class_id = announcements.class_id
      AND l.user_id IN (SELECT child_user_id FROM get_user_children())
    )
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();