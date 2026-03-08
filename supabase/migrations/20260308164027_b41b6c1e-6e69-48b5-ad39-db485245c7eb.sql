
-- Backfill student numbers for existing learners without one
DO $$
DECLARE
  current_year TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  counter INT := 0;
  max_counter INT;
  rec RECORD;
BEGIN
  -- Get current max counter
  SELECT COALESCE(
    MAX(NULLIF(SUBSTRING(student_number FROM 7)::INT, 0)), 0
  ) INTO max_counter
  FROM public.learners
  WHERE student_number LIKE 'SA' || current_year || '%';

  counter := max_counter;

  FOR rec IN 
    SELECT id FROM public.learners 
    WHERE student_number IS NULL OR student_number = '' OR student_number NOT LIKE 'SA%'
    ORDER BY created_at ASC
  LOOP
    counter := counter + 1;
    UPDATE public.learners 
    SET student_number = 'SA' || current_year || LPAD(counter::TEXT, 3, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;
