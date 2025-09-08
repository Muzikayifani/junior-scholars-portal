-- Fix the circular dependency in RLS policy by using the security definer function
DROP POLICY IF EXISTS "Teachers can create student profiles" ON public.profiles;

-- Allow teachers to create profiles for students using the security definer function
CREATE POLICY "Teachers can create student profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  get_current_user_role() = 'teacher' 
  AND role = 'learner'
);