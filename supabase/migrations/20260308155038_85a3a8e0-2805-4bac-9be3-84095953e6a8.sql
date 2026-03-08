
-- Allow admins to delete fees
CREATE POLICY "Admins can delete fees"
ON public.fees
FOR DELETE
TO authenticated
USING (is_admin());
