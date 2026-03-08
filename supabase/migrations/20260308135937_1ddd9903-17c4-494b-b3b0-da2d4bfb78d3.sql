
DROP POLICY IF EXISTS "Parents can view assessments for their children's classes" ON public.assessments;
DROP POLICY IF EXISTS "Parents can view assessments their children have results for" ON public.assessments;

CREATE POLICY "Parents can view assessments for their children's classes"
  ON public.assessments FOR SELECT TO authenticated
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM learners l
      WHERE l.class_id = assessments.class_id
      AND l.user_id IN (SELECT child_user_id FROM get_user_children())
    )
  );

CREATE POLICY "Parents can view assessments their children have results for"
  ON public.assessments FOR SELECT TO authenticated
  USING (child_has_result_for_assessment(id));
