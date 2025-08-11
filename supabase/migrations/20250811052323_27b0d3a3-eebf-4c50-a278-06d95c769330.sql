-- Ensure the signup trigger exists so profiles are created automatically
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created'
      AND n.nspname = 'auth'
      AND c.relname = 'users'
  ) THEN
    -- Drop existing trigger to allow recreation
    EXECUTE 'DROP TRIGGER on_auth_user_created ON auth.users;';
  END IF;
END $$;

-- Create trigger to call public.handle_new_user on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- Backfill profiles for existing auth users missing a profile
INSERT INTO public.profiles (user_id, first_name, last_name, email, role)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'first_name', 'First'),
  COALESCE(u.raw_user_meta_data->>'last_name', 'Last'),
  u.email,
  COALESCE((u.raw_user_meta_data->>'role')::public.user_role, 'learner'::public.user_role)
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;