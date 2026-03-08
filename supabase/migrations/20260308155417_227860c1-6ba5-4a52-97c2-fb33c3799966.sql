
-- Allow admins to delete classes
CREATE POLICY "Admins can delete classes"
ON public.classes
FOR DELETE
TO authenticated
USING (is_admin());
