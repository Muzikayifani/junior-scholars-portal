-- Delete all profiles first (to avoid foreign key issues)
DELETE FROM public.profiles;

-- Check auth users (for reference, cannot be deleted via SQL)
-- Note: auth.users cannot be deleted via SQL migration
-- This needs to be done in Supabase dashboard