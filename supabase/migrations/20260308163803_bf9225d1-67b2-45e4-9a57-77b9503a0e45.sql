
-- Function to auto-generate student numbers in format SA{YEAR}{3-digit counter}
CREATE OR REPLACE FUNCTION public.generate_student_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_year TEXT;
  max_counter INT;
  new_number TEXT;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Find the highest counter for this year
  SELECT COALESCE(
    MAX(
      NULLIF(
        SUBSTRING(student_number FROM 7)::INT, 
        0
      )
    ), 0
  ) INTO max_counter
  FROM public.learners
  WHERE student_number LIKE 'SA' || current_year || '%';
  
  -- Generate new student number: SA + YEAR + zero-padded counter
  new_number := 'SA' || current_year || LPAD((max_counter + 1)::TEXT, 3, '0');
  
  NEW.student_number := new_number;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign student number on insert
CREATE TRIGGER trg_generate_student_number
  BEFORE INSERT ON public.learners
  FOR EACH ROW
  WHEN (NEW.student_number IS NULL OR NEW.student_number = '')
  EXECUTE FUNCTION public.generate_student_number();
