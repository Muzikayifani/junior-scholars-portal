-- Add foreign key relationship between learners and profiles tables
ALTER TABLE public.learners 
ADD CONSTRAINT fk_learners_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;