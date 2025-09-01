-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('teacher', 'learner', 'parent', 'admin');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role app_role NOT NULL DEFAULT 'learner',
  avatar_url TEXT,
  phone TEXT,
  date_of_birth DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  grade_level INTEGER NOT NULL,
  school_year TEXT NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  capacity INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create learners table (student enrollment)
CREATE TABLE public.learners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'transferred')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, class_id)
);

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('quiz', 'test', 'assignment', 'project', 'exam')),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_marks INTEGER NOT NULL DEFAULT 100,
  due_date TIMESTAMP WITH TIME ZONE,
  instructions TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create results table
CREATE TABLE public.results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  marks_obtained INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE,
  graded_at TIMESTAMP WITH TIME ZONE,
  feedback TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded', 'returned')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, learner_id)
);

-- Create class_schedule table
CREATE TABLE public.class_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedule ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for subjects (readable by all authenticated users)
CREATE POLICY "Subjects are viewable by authenticated users" ON public.subjects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only teachers can manage subjects" ON public.subjects
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- Create RLS policies for classes
CREATE POLICY "Teachers can view and manage their classes" ON public.classes
  FOR ALL TO authenticated USING (teacher_id = auth.uid());

CREATE POLICY "Students can view their enrolled classes" ON public.classes
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.learners 
      WHERE class_id = classes.id AND user_id = auth.uid()
    )
  );

-- Create RLS policies for learners
CREATE POLICY "Teachers can manage learners in their classes" ON public.learners
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.classes 
      WHERE id = learners.class_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own enrollment" ON public.learners
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Create RLS policies for assessments
CREATE POLICY "Teachers can manage their assessments" ON public.assessments
  FOR ALL TO authenticated USING (teacher_id = auth.uid());

CREATE POLICY "Students can view published assessments in their classes" ON public.assessments
  FOR SELECT TO authenticated USING (
    is_published = true AND 
    EXISTS (
      SELECT 1 FROM public.learners 
      WHERE class_id = assessments.class_id AND user_id = auth.uid()
    )
  );

-- Create RLS policies for results
CREATE POLICY "Teachers can manage results for their assessments" ON public.results
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.assessments 
      WHERE id = results.assessment_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own results" ON public.results
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.learners 
      WHERE id = results.learner_id AND user_id = auth.uid()
    )
  );

-- Create RLS policies for class_schedule
CREATE POLICY "Teachers can manage schedules for their classes" ON public.class_schedule
  FOR ALL TO authenticated USING (teacher_id = auth.uid());

CREATE POLICY "Students can view schedules for their classes" ON public.class_schedule
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.learners 
      WHERE class_id = class_schedule.class_id AND user_id = auth.uid()
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_results_updated_at
  BEFORE UPDATE ON public.results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_class_schedule_updated_at
  BEFORE UPDATE ON public.class_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample subjects
INSERT INTO public.subjects (name, code, description) VALUES
  ('Mathematics', 'MATH', 'Basic mathematics including algebra, geometry, and calculus'),
  ('English Language', 'ENG', 'English language arts, literature, and writing'),
  ('Science', 'SCI', 'General science including biology, chemistry, and physics'),
  ('Social Studies', 'SS', 'History, geography, and social sciences'),
  ('Physical Education', 'PE', 'Physical fitness and sports activities'),
  ('Arts', 'ART', 'Visual arts, music, and creative expression');