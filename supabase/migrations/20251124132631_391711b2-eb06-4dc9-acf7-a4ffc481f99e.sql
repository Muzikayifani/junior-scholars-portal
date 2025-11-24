-- =====================================================
-- Phase 1: Parent Portal Database Schema
-- =====================================================

-- Create parent_child_relationships table
CREATE TABLE IF NOT EXISTS public.parent_child_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  child_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'parent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(parent_user_id, child_user_id),
  CHECK (parent_user_id != child_user_id)
);

-- Add index for faster lookups
CREATE INDEX idx_parent_child_parent ON public.parent_child_relationships(parent_user_id);
CREATE INDEX idx_parent_child_child ON public.parent_child_relationships(child_user_id);

-- Enable RLS on parent_child_relationships
ALTER TABLE public.parent_child_relationships ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger for parent_child_relationships
CREATE TRIGGER update_parent_child_relationships_updated_at
  BEFORE UPDATE ON public.parent_child_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Security Definer Functions for Parent Access
-- =====================================================

-- Function: Check if current user is a parent of a specific child
CREATE OR REPLACE FUNCTION public.user_is_parent_of(child_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_child_relationships
    WHERE parent_user_id = auth.uid()
    AND child_user_id = user_is_parent_of.child_user_id
  );
$$;

-- Function: Get all children user_ids for current parent
CREATE OR REPLACE FUNCTION public.get_user_children()
RETURNS TABLE(child_user_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT child_user_id
  FROM public.parent_child_relationships
  WHERE parent_user_id = auth.uid();
$$;

-- Function: Check if current user is a parent (has any children)
CREATE OR REPLACE FUNCTION public.is_parent()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_child_relationships
    WHERE parent_user_id = auth.uid()
  );
$$;

-- =====================================================
-- RLS Policies for parent_child_relationships
-- =====================================================

-- Parents can view their own relationships
CREATE POLICY "Parents can view their own children relationships"
ON public.parent_child_relationships
FOR SELECT
USING (parent_user_id = auth.uid());

-- Parents can view relationships where they are the child (for verification)
CREATE POLICY "Users can view their own parent relationships"
ON public.parent_child_relationships
FOR SELECT
USING (child_user_id = auth.uid());

-- Only admins/teachers can create relationships (will be managed by admin panel)
CREATE POLICY "Teachers can create parent-child relationships"
ON public.parent_child_relationships
FOR INSERT
WITH CHECK (is_teacher());

-- =====================================================
-- Additional RLS Policies for Parent Access
-- =====================================================

-- Parents can view their children's profiles
CREATE POLICY "Parents can view their children's profiles"
ON public.profiles
FOR SELECT
USING (user_id IN (SELECT child_user_id FROM public.get_user_children()));

-- Parents can view their children's learner records
CREATE POLICY "Parents can view their children's enrollment"
ON public.learners
FOR SELECT
USING (user_id IN (SELECT child_user_id FROM public.get_user_children()));

-- Parents can view their children's results
CREATE POLICY "Parents can view their children's results"
ON public.results
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.learners l
    WHERE l.id = results.learner_id
    AND l.user_id IN (SELECT child_user_id FROM public.get_user_children())
  )
);

-- Parents can view assessments for their children's classes
CREATE POLICY "Parents can view assessments for their children's classes"
ON public.assessments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.learners l
    WHERE l.class_id = assessments.class_id
    AND l.user_id IN (SELECT child_user_id FROM public.get_user_children())
  )
  AND is_published = true
);

-- Parents can view class schedules for their children's classes
CREATE POLICY "Parents can view their children's class schedules"
ON public.class_schedule
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.learners l
    WHERE l.class_id = class_schedule.class_id
    AND l.user_id IN (SELECT child_user_id FROM public.get_user_children())
  )
);

-- Parents can view classes their children are enrolled in
CREATE POLICY "Parents can view their children's classes"
ON public.classes
FOR SELECT
USING (
  id IN (
    SELECT l.class_id
    FROM public.learners l
    WHERE l.user_id IN (SELECT child_user_id FROM public.get_user_children())
  )
);