
-- The teacher ALL policy is RESTRICTIVE, which blocks SELECT for non-teachers
-- Fix: make it PERMISSIVE so it doesn't block learners/parents
DROP POLICY IF EXISTS "Teachers can manage their assessments" ON public.assessments;

CREATE POLICY "Teachers can manage their assessments"
  ON public.assessments FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());
