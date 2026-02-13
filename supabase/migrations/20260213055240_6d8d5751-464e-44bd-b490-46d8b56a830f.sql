-- Allow teachers to view all learner profiles in the school
CREATE POLICY "Teachers can view all learner profiles"
ON public.profiles
FOR SELECT
USING (
  (role = 'learner'::app_role) AND is_teacher()
);