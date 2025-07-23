-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('learner', 'parent', 'teacher', 'admin');

-- Create assessment types enum  
CREATE TYPE public.assessment_type AS ENUM ('assignment', 'classwork', 'homework', 'test', 'exam');

-- Create assessment status enum
CREATE TYPE public.assessment_status AS ENUM ('pending', 'submitted', 'graded');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'learner',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  grade_level INTEGER NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create learners table
CREATE TABLE public.learners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_number TEXT NOT NULL UNIQUE,
  class_id UUID REFERENCES public.classes(id),
  date_of_birth DATE,
  address TEXT,
  emergency_contact TEXT,
  parent_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessments table (assignments, tests, etc.)
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type assessment_type NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id),
  total_marks INTEGER NOT NULL DEFAULT 100,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create results table
CREATE TABLE public.results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  marks_obtained INTEGER,
  status assessment_status NOT NULL DEFAULT 'pending',
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, learner_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for learners
CREATE POLICY "Learners can view their own data" ON public.learners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = learners.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children" ON public.learners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = learners.parent_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view learners in their classes" ON public.learners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classes 
      JOIN public.profiles ON profiles.id = classes.teacher_id
      WHERE classes.id = learners.class_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for assessments
CREATE POLICY "Teachers can manage their assessments" ON public.assessments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = assessments.teacher_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Learners can view assessments for their class" ON public.assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.learners 
      JOIN public.profiles ON profiles.id = learners.profile_id
      WHERE learners.class_id = assessments.class_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for results
CREATE POLICY "Learners can view their own results" ON public.results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.learners 
      JOIN public.profiles ON profiles.id = learners.profile_id
      WHERE learners.id = results.learner_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children's results" ON public.results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.learners 
      JOIN public.profiles ON profiles.id = learners.parent_id
      WHERE learners.id = results.learner_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage results for their assessments" ON public.results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assessments 
      JOIN public.profiles ON profiles.id = assessments.teacher_id
      WHERE assessments.id = results.assessment_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'First'),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'Last'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learners_updated_at
  BEFORE UPDATE ON public.learners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_results_updated_at
  BEFORE UPDATE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();