-- Update RLS policies for profiles to allow teachers to create student profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow teachers to create profiles for students (learners)
CREATE POLICY "Teachers can create student profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'teacher'
  )
  AND NEW.role = 'learner'
);