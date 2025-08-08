-- Add foreign key constraints for assessments table
ALTER TABLE public.assessments 
ADD CONSTRAINT assessments_class_id_fkey 
FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

ALTER TABLE public.assessments 
ADD CONSTRAINT assessments_subject_id_fkey 
FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

ALTER TABLE public.assessments 
ADD CONSTRAINT assessments_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraints for class_schedule table  
ALTER TABLE public.class_schedule 
ADD CONSTRAINT class_schedule_class_id_fkey 
FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

ALTER TABLE public.class_schedule 
ADD CONSTRAINT class_schedule_subject_id_fkey 
FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

ALTER TABLE public.class_schedule 
ADD CONSTRAINT class_schedule_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraints for classes table
ALTER TABLE public.classes 
ADD CONSTRAINT classes_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key constraints for learners table
ALTER TABLE public.learners 
ADD CONSTRAINT learners_class_id_fkey 
FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;

ALTER TABLE public.learners 
ADD CONSTRAINT learners_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.learners 
ADD CONSTRAINT learners_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key constraints for results table
ALTER TABLE public.results 
ADD CONSTRAINT results_learner_id_fkey 
FOREIGN KEY (learner_id) REFERENCES public.learners(id) ON DELETE CASCADE;

ALTER TABLE public.results 
ADD CONSTRAINT results_assessment_id_fkey 
FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;