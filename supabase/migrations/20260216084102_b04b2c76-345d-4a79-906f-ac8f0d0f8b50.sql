
-- Add permissive INSERT policy for teachers to enroll students in their classes
CREATE POLICY "Teachers can insert learners into their classes"
ON public.learners
FOR INSERT
TO authenticated
WITH CHECK (
  user_owns_class(class_id)
);
