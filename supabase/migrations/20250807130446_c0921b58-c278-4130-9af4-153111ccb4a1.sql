-- Create profile for the authenticated user
INSERT INTO public.profiles (
  user_id,
  first_name,
  last_name,
  email,
  role
) VALUES (
  '84977d6b-e471-4b7b-a1e7-7c7bae23413b'::uuid,
  'Admin',
  'User',
  'admin@test.com',
  'teacher'::user_role
) ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;