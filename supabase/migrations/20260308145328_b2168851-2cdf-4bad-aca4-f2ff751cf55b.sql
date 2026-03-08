
-- Admin can manage all learners
CREATE POLICY "Admins can manage all learners"
  ON public.learners FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin can manage all fees
CREATE POLICY "Admins can manage all fees"
  ON public.fees FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin can manage parent-child relationships
CREATE POLICY "Admins can manage parent relationships"
  ON public.parent_child_relationships FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin can manage all classes
CREATE POLICY "Admins can manage all classes"
  ON public.classes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin can view all subjects
CREATE POLICY "Admins can view all subjects"
  ON public.subjects FOR SELECT
  USING (is_admin());
