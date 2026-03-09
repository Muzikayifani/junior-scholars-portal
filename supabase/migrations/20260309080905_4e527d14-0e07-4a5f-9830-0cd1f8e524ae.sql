
-- Drop the restrictive policies and recreate as permissive for learner SELECT
DROP POLICY IF EXISTS "Students can view published assessments in their classes" ON public.assessments;
DROP POLICY IF EXISTS "Learners can view assessments they have results for" ON public.assessments;

-- Recreate as PERMISSIVE so learners can see published assessments OR ones they have results for
CREATE POLICY "Students can view published assessments in their classes"
ON public.assessments
FOR SELECT
TO authenticated
USING ((is_published = true) AND (EXISTS (
  SELECT 1 FROM learners
  WHERE learners.class_id = assessments.class_id AND learners.user_id = auth.uid()
)));

CREATE POLICY "Learners can view assessments they have results for"
ON public.assessments
FOR SELECT
TO authenticated
USING (learner_has_result_for_assessment(id));
