
-- Create helper function for admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  );
$$;

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_admin());

-- Admin can view all classes
CREATE POLICY "Admins can view all classes"
  ON public.classes FOR SELECT
  USING (is_admin());

-- Admin can view all assessments
CREATE POLICY "Admins can view all assessments"
  ON public.assessments FOR SELECT
  USING (is_admin());
