-- Create profile for existing user who doesn't have one
INSERT INTO public.profiles (user_id, full_name, email, role)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(raw_user_meta_data->>'last_name', ''),
    email,
    COALESCE(raw_user_meta_data->>'role', 'learner')::app_role
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.profiles);