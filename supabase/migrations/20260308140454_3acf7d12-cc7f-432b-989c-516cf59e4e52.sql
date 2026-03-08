
-- Publish all existing assessments so they're visible to learners and parents
UPDATE public.assessments SET is_published = true WHERE is_published = false;
