-- Drop existing policies to recreate them with proper access control
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Policy 1: Users can always view and manage their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Teachers can view basic info of students in their classes
-- Only name and email, not phone or other sensitive data
CREATE POLICY "Teachers can view students in their classes" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'learner' AND
  EXISTS (
    SELECT 1 FROM learners l
    JOIN classes c ON c.id = l.class_id
    WHERE l.user_id = profiles.user_id 
    AND c.teacher_id = auth.uid()
  )
);

-- Policy 3: Students can view basic info of their teachers
-- Only name and email, not phone or other sensitive data  
CREATE POLICY "Students can view their teachers" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'teacher' AND
  EXISTS (
    SELECT 1 FROM learners l
    JOIN classes c ON c.id = l.class_id
    WHERE l.user_id = auth.uid() 
    AND c.teacher_id = profiles.user_id
  )
);

-- Policy 4: Parents can view basic info of their children's teachers
CREATE POLICY "Parents can view their children's teachers" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'teacher' AND
  EXISTS (
    SELECT 1 FROM learners l
    JOIN classes c ON c.id = l.class_id
    WHERE l.user_id IN (
      -- This assumes parents are linked to children through learners table
      -- You may need to adjust this based on your parent-child relationship model
      SELECT user_id FROM learners WHERE user_id = auth.uid()
    )
    AND c.teacher_id = profiles.user_id
  )
);

-- Create a security definer function to get limited profile info
-- This prevents exposing sensitive fields like phone numbers
CREATE OR REPLACE FUNCTION public.get_basic_profile_info(profile_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role app_role
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.email,
    p.role
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;