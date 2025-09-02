-- Fix database schema issues and add missing relationships

-- Add missing school_year field default and make it optional for existing records
ALTER TABLE classes ALTER COLUMN school_year SET DEFAULT '2024-2025';
UPDATE classes SET school_year = '2024-2025' WHERE school_year IS NULL;

-- Add student_number field to learners table
ALTER TABLE learners ADD COLUMN student_number TEXT;

-- Create class_subjects junction table to assign subjects to classes
CREATE TABLE IF NOT EXISTS public.class_subjects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(class_id, subject_id)
);

-- Enable RLS on class_subjects
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

-- Create policies for class_subjects
CREATE POLICY "Teachers can manage subjects for their classes" 
ON public.class_subjects 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = class_subjects.class_id 
    AND classes.teacher_id = auth.uid()
));

CREATE POLICY "Students can view subjects for their classes" 
ON public.class_subjects 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM learners 
    JOIN classes ON classes.id = learners.class_id
    WHERE classes.id = class_subjects.class_id 
    AND learners.user_id = auth.uid()
));

-- Add foreign key relationships that were missing
-- Add foreign key from learners to profiles  
ALTER TABLE learners ADD CONSTRAINT fk_learners_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Add foreign key from classes to profiles
ALTER TABLE classes ADD CONSTRAINT fk_classes_teacher_id 
FOREIGN KEY (teacher_id) REFERENCES profiles(user_id) ON DELETE SET NULL;

-- Add foreign key from class_schedule to profiles
ALTER TABLE class_schedule ADD CONSTRAINT fk_class_schedule_teacher_id 
FOREIGN KEY (teacher_id) REFERENCES profiles(user_id) ON DELETE CASCADE;