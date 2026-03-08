-- Fix 1: Allow learners to view assessment details when they have a result for it
CREATE POLICY "Learners can view assessments they have results for"
ON public.assessments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM results r
    JOIN learners l ON l.id = r.learner_id
    WHERE r.assessment_id = assessments.id
    AND l.user_id = auth.uid()
  )
);

-- Fix 2: Allow parents to view assessments their children have results for
CREATE POLICY "Parents can view assessments their children have results for"
ON public.assessments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM results r
    JOIN learners l ON l.id = r.learner_id
    WHERE r.assessment_id = assessments.id
    AND l.user_id IN (SELECT child_user_id FROM get_user_children())
  )
);

-- Fix 3: Update handle_new_user to also populate first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    full_name,
    first_name,
    last_name,
    email,
    role
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'learner')::app_role
  );
  RETURN NEW;
END;
$$;