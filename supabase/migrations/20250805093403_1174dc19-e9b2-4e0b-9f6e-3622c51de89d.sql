-- Create a superuser for testing
-- Note: This inserts directly into auth.users which is normally handled by Supabase Auth
-- This is for testing purposes only

-- Insert test user into auth.users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  role,
  aud
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin@test.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"first_name": "Super", "last_name": "Admin", "role": "teacher"}'::jsonb,
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Insert corresponding profile (this will be handled by the trigger, but let's ensure it exists)
INSERT INTO public.profiles (
  user_id,
  first_name,
  last_name,
  email,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Super',
  'Admin',
  'admin@test.com',
  'teacher'::user_role
) ON CONFLICT (user_id) DO NOTHING;