-- Assign test class to test teacher
UPDATE classes 
SET teacher_id = '916c0b8e-4b36-4833-b71c-ac3d7f864899' 
WHERE id = 'd8c164dc-d481-4a2c-a02f-2d8b66a25f6b';

-- Publish all assessments so learners/parents can see them
UPDATE assessments SET is_published = true;