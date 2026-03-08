
-- Drop the existing teacher policy that gives full CRUD access
DROP POLICY IF EXISTS "Teachers can manage fees" ON public.fees;

-- Add a SELECT-only policy for teachers, scoped to students in their classes
CREATE POLICY "Teachers can view fees for their students"
ON public.fees
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM learners l
    JOIN classes c ON c.id = l.class_id
    WHERE l.user_id = fees.learner_user_id
    AND c.teacher_id = auth.uid()
  )
);
