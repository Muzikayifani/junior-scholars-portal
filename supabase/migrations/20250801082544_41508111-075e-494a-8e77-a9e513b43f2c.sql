-- Fix security issues by updating RLS policies to require authentication
-- and adding policies for classes and subjects tables

-- Drop existing policies to recreate them with proper authentication checks
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Learners can view their own data" ON public.learners;
DROP POLICY IF EXISTS "Parents can view their children" ON public.learners;
DROP POLICY IF EXISTS "Teachers can view learners in their classes" ON public.learners;
DROP POLICY IF EXISTS "Teachers can manage their assessments" ON public.assessments;
DROP POLICY IF EXISTS "Learners can view assessments for their class" ON public.assessments;
DROP POLICY IF EXISTS "Teachers can manage their own schedule" ON public.class_schedule;
DROP POLICY IF EXISTS "Teachers can manage results for their assessments" ON public.results;
DROP POLICY IF EXISTS "Learners can view their own results" ON public.results;
DROP POLICY IF EXISTS "Parents can view their children's results" ON public.results;

-- Recreate RLS policies for profiles with authenticated role
CREATE POLICY "Users can view their own profile" ON public.profiles 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);

-- Recreate RLS policies for learners with authenticated role
CREATE POLICY "Learners can view their own data" ON public.learners 
FOR SELECT TO authenticated 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = learners.profile_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Parents can view their children" ON public.learners 
FOR SELECT TO authenticated 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = learners.parent_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Teachers can view learners in their classes" ON public.learners 
FOR SELECT TO authenticated 
USING (
    EXISTS (SELECT 1 FROM classes JOIN profiles ON profiles.id = classes.teacher_id 
            WHERE classes.id = learners.class_id AND profiles.user_id = auth.uid())
);

-- Recreate RLS policies for assessments with authenticated role
CREATE POLICY "Teachers can manage their assessments" ON public.assessments 
FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = assessments.teacher_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Learners can view assessments for their class" ON public.assessments 
FOR SELECT TO authenticated 
USING (
    EXISTS (SELECT 1 FROM learners JOIN profiles ON profiles.id = learners.profile_id 
            WHERE learners.class_id = assessments.class_id AND profiles.user_id = auth.uid())
);

-- Recreate RLS policies for class_schedule with authenticated role
CREATE POLICY "Teachers can manage their own schedule" ON public.class_schedule 
FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = class_schedule.teacher_id AND profiles.user_id = auth.uid())
);

-- Recreate RLS policies for results with authenticated role
CREATE POLICY "Teachers can manage results for their assessments" ON public.results 
FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM assessments JOIN profiles ON profiles.id = assessments.teacher_id 
            WHERE assessments.id = results.assessment_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Learners can view their own results" ON public.results 
FOR SELECT TO authenticated 
USING (
    EXISTS (SELECT 1 FROM learners JOIN profiles ON profiles.id = learners.profile_id 
            WHERE learners.id = results.learner_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Parents can view their children's results" ON public.results 
FOR SELECT TO authenticated 
USING (
    EXISTS (SELECT 1 FROM learners JOIN profiles ON profiles.id = learners.parent_id 
            WHERE learners.id = results.learner_id AND profiles.user_id = auth.uid())
);

-- Add RLS policies for classes table
CREATE POLICY "Teachers can view all classes" ON public.classes 
FOR SELECT TO authenticated 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'teacher')
);

CREATE POLICY "Teachers can manage classes" ON public.classes 
FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'teacher')
);

-- Add RLS policies for subjects table
CREATE POLICY "All authenticated users can view subjects" ON public.subjects 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Teachers can manage subjects" ON public.subjects 
FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'teacher')
);