-- Create grades table with grades 1-12
CREATE TABLE public.grades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level integer NOT NULL UNIQUE CHECK (level >= 1 AND level <= 12),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Create policy for grades - everyone can view grades
CREATE POLICY "Grades are viewable by authenticated users" 
ON public.grades 
FOR SELECT 
USING (true);

-- Insert all grades 1-12
INSERT INTO public.grades (level, name, description) VALUES
  (1, 'Grade 1', 'First Grade'),
  (2, 'Grade 2', 'Second Grade'), 
  (3, 'Grade 3', 'Third Grade'),
  (4, 'Grade 4', 'Fourth Grade'),
  (5, 'Grade 5', 'Fifth Grade'),
  (6, 'Grade 6', 'Sixth Grade'),
  (7, 'Grade 7', 'Seventh Grade'),
  (8, 'Grade 8', 'Eighth Grade'),
  (9, 'Grade 9', 'Ninth Grade'),
  (10, 'Grade 10', 'Tenth Grade'),
  (11, 'Grade 11', 'Eleventh Grade'),
  (12, 'Grade 12', 'Twelfth Grade');