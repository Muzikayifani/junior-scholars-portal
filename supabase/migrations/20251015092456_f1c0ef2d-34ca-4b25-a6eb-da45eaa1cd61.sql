-- Phase 1: Add submission_path column to results table and create storage infrastructure

-- First, add the submission_path column to results table if it doesn't exist
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS submission_path TEXT;

-- Create the submissions storage bucket with file size and type restrictions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  false,
  20971520, -- 20MB in bytes
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain'
  ]
);

-- RLS Policy: Learners can upload submissions to their own folder
CREATE POLICY "Learners can upload their submissions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submissions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Learners can view/download their own submissions
CREATE POLICY "Learners can read their own submissions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'submissions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Teachers can view submissions for their assessments
CREATE POLICY "Teachers can read submissions for their assessments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'submissions' AND
  EXISTS (
    SELECT 1
    FROM results r
    JOIN assessments a ON a.id = r.assessment_id
    WHERE a.teacher_id = auth.uid()
    AND r.submission_path = name
  )
);

-- Add index for better query performance on submission_path
CREATE INDEX IF NOT EXISTS idx_results_submission_path ON results(submission_path) WHERE submission_path IS NOT NULL;