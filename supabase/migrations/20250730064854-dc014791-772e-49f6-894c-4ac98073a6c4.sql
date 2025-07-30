-- Drop all existing tables (order matters due to potential dependencies)
DROP TABLE IF EXISTS public.results CASCADE;
DROP TABLE IF EXISTS public.assessments CASCADE;
DROP TABLE IF EXISTS public.class_schedule CASCADE;
DROP TABLE IF EXISTS public.learners CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS public.assessment_status CASCADE;
DROP TYPE IF EXISTS public.assessment_type CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Recreate types
CREATE TYPE public.user_role AS ENUM ('teacher', 'learner', 'parent');
CREATE TYPE public.assessment_type AS ENUM ('quiz', 'test', 'assignment', 'exam');
CREATE TYPE public.assessment_status AS ENUM ('pending', 'submitted', 'graded');

-- Recreate profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'learner'::user_role,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recreate classes table
CREATE TABLE public.classes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    grade_level INTEGER NOT NULL,
    teacher_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recreate subjects table
CREATE TABLE public.subjects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recreate learners table
CREATE TABLE public.learners (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL,
    parent_id UUID,
    student_number TEXT NOT NULL,
    "Student FullName" TEXT,
    date_of_birth DATE,
    address TEXT,
    emergency_contact TEXT,
    class_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recreate assessments table
CREATE TABLE public.assessments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type assessment_type NOT NULL,
    class_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    total_marks INTEGER NOT NULL DEFAULT 100,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recreate class_schedule table
CREATE TABLE public.class_schedule (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recreate results table
CREATE TABLE public.results (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    assessment_id UUID NOT NULL,
    learner_id UUID NOT NULL,
    marks_obtained INTEGER,
    status assessment_status NOT NULL DEFAULT 'pending'::assessment_status,
    submitted_at TIMESTAMP WITH TIME ZONE,
    graded_at TIMESTAMP WITH TIME ZONE,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Recreate RLS policies for learners
CREATE POLICY "Learners can view their own data" ON public.learners FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = learners.profile_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "Parents can view their children" ON public.learners FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = learners.parent_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "Teachers can view learners in their classes" ON public.learners FOR SELECT USING (
    EXISTS (SELECT 1 FROM classes JOIN profiles ON profiles.id = classes.teacher_id 
            WHERE classes.id = learners.class_id AND profiles.user_id = auth.uid())
);

-- Recreate RLS policies for assessments
CREATE POLICY "Teachers can manage their assessments" ON public.assessments FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = assessments.teacher_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "Learners can view assessments for their class" ON public.assessments FOR SELECT USING (
    EXISTS (SELECT 1 FROM learners JOIN profiles ON profiles.id = learners.profile_id 
            WHERE learners.class_id = assessments.class_id AND profiles.user_id = auth.uid())
);

-- Recreate RLS policies for class_schedule
CREATE POLICY "Teachers can manage their own schedule" ON public.class_schedule FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = class_schedule.teacher_id AND profiles.user_id = auth.uid())
);

-- Recreate RLS policies for results
CREATE POLICY "Teachers can manage results for their assessments" ON public.results FOR ALL USING (
    EXISTS (SELECT 1 FROM assessments JOIN profiles ON profiles.id = assessments.teacher_id 
            WHERE assessments.id = results.assessment_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "Learners can view their own results" ON public.results FOR SELECT USING (
    EXISTS (SELECT 1 FROM learners JOIN profiles ON profiles.id = learners.profile_id 
            WHERE learners.id = results.learner_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "Parents can view their children's results" ON public.results FOR SELECT USING (
    EXISTS (SELECT 1 FROM learners JOIN profiles ON profiles.id = learners.parent_id 
            WHERE learners.id = results.learner_id AND profiles.user_id = auth.uid())
);

-- Recreate triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_learners_updated_at BEFORE UPDATE ON public.learners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_class_schedule_updated_at BEFORE UPDATE ON public.class_schedule FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_results_updated_at BEFORE UPDATE ON public.results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();