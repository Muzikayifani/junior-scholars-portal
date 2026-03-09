
CREATE TABLE public.assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

-- Teachers can manage questions for their assessments
CREATE POLICY "Teachers can manage their assessment questions"
ON public.assessment_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_questions.assessment_id
    AND a.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_questions.assessment_id
    AND a.teacher_id = auth.uid()
  )
);

-- Students can view questions for published assessments in their classes
CREATE POLICY "Students can view questions for their assessments"
ON public.assessment_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assessments a
    JOIN public.learners l ON l.class_id = a.class_id
    WHERE a.id = assessment_questions.assessment_id
    AND a.is_published = true
    AND l.user_id = auth.uid()
  )
);

-- Parents can view questions for their children's assessments
CREATE POLICY "Parents can view children assessment questions"
ON public.assessment_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assessments a
    JOIN public.learners l ON l.class_id = a.class_id
    WHERE a.id = assessment_questions.assessment_id
    AND a.is_published = true
    AND l.user_id IN (SELECT child_user_id FROM get_user_children())
  )
);
