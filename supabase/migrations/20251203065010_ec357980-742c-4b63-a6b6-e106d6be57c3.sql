-- Allow teachers to view parent profiles so they can search and select existing parents
CREATE POLICY "Teachers can view parent profiles"
ON public.profiles
FOR SELECT
USING (
  role = 'parent'::app_role AND is_teacher()
);

-- Allow teachers to delete parent-child relationships for students they teach
CREATE POLICY "Teachers can delete parent-child relationships"
ON public.parent_child_relationships
FOR DELETE
USING (
  is_teacher() AND EXISTS (
    SELECT 1 FROM learners l
    JOIN classes c ON c.id = l.class_id
    WHERE l.user_id = parent_child_relationships.child_user_id
    AND c.teacher_id = auth.uid()
  )
);