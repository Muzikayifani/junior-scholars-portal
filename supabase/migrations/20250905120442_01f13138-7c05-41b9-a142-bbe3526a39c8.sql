-- Drop problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Students can view classes they are enrolled in" ON public.classes;
DROP POLICY IF EXISTS "Teachers can manage learners in their classes" ON public.learners;

-- Create security definer functions to safely check relationships
CREATE OR REPLACE FUNCTION public.user_is_enrolled_in_class(target_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.learners
    WHERE class_id = target_class_id 
    AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_class(target_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = target_class_id 
    AND teacher_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.class_belongs_to_teacher(target_learner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.learners l
    JOIN public.classes c ON c.id = l.class_id
    WHERE l.id = target_learner_id 
    AND c.teacher_id = auth.uid()
  );
$$;

-- Recreate RLS policies using security definer functions
CREATE POLICY "Students can view classes they are enrolled in" 
ON public.classes 
FOR SELECT 
USING (public.user_is_enrolled_in_class(id));

CREATE POLICY "Teachers can manage learners in their classes" 
ON public.learners 
FOR ALL 
USING (public.class_belongs_to_teacher(id));