-- Backfill first_name and last_name from full_name for existing profiles
UPDATE profiles 
SET 
  first_name = split_part(full_name, ' ', 1),
  last_name = CASE 
    WHEN position(' ' IN full_name) > 0 
    THEN substring(full_name FROM position(' ' IN full_name) + 1) 
    ELSE NULL 
  END
WHERE first_name IS NULL AND full_name IS NOT NULL;