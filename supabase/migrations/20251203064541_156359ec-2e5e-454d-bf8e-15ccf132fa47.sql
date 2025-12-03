-- Allow teachers to update profiles of students they teach
CREATE POLICY "Teachers can update student profiles"
ON public.profiles
FOR UPDATE
USING (
  (role = 'learner'::app_role) AND user_teaches_student(user_id)
)
WITH CHECK (
  (role = 'learner'::app_role) AND user_teaches_student(user_id)
);