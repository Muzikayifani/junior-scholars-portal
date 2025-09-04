-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Teachers can view students in their classes" ON public.profiles;
DROP POLICY IF EXISTS "Students can view their teachers" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view their children's teachers" ON public.profiles;

-- Create security definer functions to prevent recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_teaches_student(student_user_id uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM learners l
    JOIN classes c ON c.id = l.class_id
    WHERE l.user_id = student_user_id 
    AND c.teacher_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_is_taught_by(teacher_user_id uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM learners l
    JOIN classes c ON c.id = l.class_id
    WHERE l.user_id = auth.uid()
    AND c.teacher_id = teacher_user_id
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Recreate safe policies using security definer functions
CREATE POLICY "Teachers can view students in their classes" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'learner' AND
  public.user_teaches_student(user_id)
);

CREATE POLICY "Students can view their teachers" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'teacher' AND
  public.user_is_taught_by(user_id)
);