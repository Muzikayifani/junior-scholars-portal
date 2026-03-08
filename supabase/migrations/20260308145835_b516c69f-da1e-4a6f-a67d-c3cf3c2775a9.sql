
-- Prevent non-admin users from inserting profiles with admin role
CREATE OR REPLACE FUNCTION public.check_admin_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin'::app_role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'::app_role
    ) THEN
      RAISE EXCEPTION 'Only admin users can create admin profiles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Prevent non-admin users from updating profiles to admin role
CREATE OR REPLACE FUNCTION public.check_admin_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin'::app_role AND (OLD.role IS NULL OR OLD.role != 'admin'::app_role) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'::app_role
    ) THEN
      RAISE EXCEPTION 'Only admin users can assign admin role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_admin_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_admin_profile_insert();

CREATE TRIGGER check_admin_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_admin_profile_update();
