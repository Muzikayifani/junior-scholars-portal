-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Learners can view assessments they have results for" ON public.assessments;
DROP POLICY IF EXISTS "Parents can view assessments their children have results for" ON public.assessments;

-- Create a security definer function that bypasses RLS to check results
CREATE OR REPLACE FUNCTION public.learner_has_result_for_assessment(target_assessment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM results r
    JOIN learners l ON l.id = r.learner_id
    WHERE r.assessment_id = target_assessment_id
    AND l.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.child_has_result_for_assessment(target_assessment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM results r
    JOIN learners l ON l.id = r.learner_id
    WHERE r.assessment_id = target_assessment_id
    AND l.user_id IN (SELECT child_user_id FROM get_user_children())
  );
$$;

-- Recreate with security definer functions (no recursion)
CREATE POLICY "Learners can view assessments they have results for"
ON public.assessments
FOR SELECT
TO authenticated
USING (learner_has_result_for_assessment(id));

CREATE POLICY "Parents can view assessments their children have results for"
ON public.assessments
FOR SELECT
TO authenticated
USING (child_has_result_for_assessment(id));