-- Create a superuser for testing using a simple approach
-- Just insert into profiles table and let the trigger handle the auth part

-- First ensure we have proper constraints
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Create a test profile that will be used for the superuser
-- We'll use a fixed UUID for consistent testing
INSERT INTO public.profiles (
  user_id,
  first_name,
  last_name,
  email,
  role
) VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Test',
  'Admin',
  'admin@test.com',
  'teacher'::user_role
) ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;