-- Drop the problematic policy
DROP POLICY IF EXISTS "Teachers can create student profiles" ON public.profiles;

-- Create a new security definer function to check if user is a teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'teacher'::app_role
  );
$$;

-- Create a new policy that allows teachers to insert learner profiles
CREATE POLICY "Teachers can create student profiles" 
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_teacher() AND role = 'learner'::app_role
);