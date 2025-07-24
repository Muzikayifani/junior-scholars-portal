-- Create class_schedule table for managing teacher schedules
CREATE TABLE public.class_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  class_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, day_of_week, start_time, end_time)
);

-- Enable RLS
ALTER TABLE public.class_schedule ENABLE ROW LEVEL SECURITY;

-- Create policies for class_schedule
CREATE POLICY "Teachers can manage their own schedule" 
ON public.class_schedule 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = class_schedule.teacher_id 
  AND profiles.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_class_schedule_updated_at
BEFORE UPDATE ON public.class_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create some default subjects if they don't exist
INSERT INTO public.subjects (name, code, description) VALUES
  ('Mathematics', 'MATH', 'Mathematics curriculum for primary school'),
  ('English', 'ENG', 'English language and literature'),
  ('Science', 'SCI', 'General science curriculum'),
  ('Social Studies', 'SS', 'Social studies and geography'),
  ('Physical Education', 'PE', 'Physical education and sports'),
  ('Art', 'ART', 'Creative arts and crafts')
ON CONFLICT (code) DO NOTHING;

-- Create some default classes if they don't exist
INSERT INTO public.classes (name, grade_level) VALUES
  ('Grade 1A', 1),
  ('Grade 1B', 1),
  ('Grade 2A', 2),
  ('Grade 2B', 2),
  ('Grade 3A', 3),
  ('Grade 3B', 3),
  ('Grade 4A', 4),
  ('Grade 4B', 4),
  ('Grade 5A', 5),
  ('Grade 5B', 5)
ON CONFLICT (name) DO NOTHING;