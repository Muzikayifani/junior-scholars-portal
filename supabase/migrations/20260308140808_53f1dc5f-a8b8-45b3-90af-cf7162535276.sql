
-- Allow learners to submit their own results (INSERT)
CREATE POLICY "Learners can submit their own results"
  ON public.results FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM learners l
      WHERE l.id = results.learner_id
      AND l.user_id = auth.uid()
    )
  );

-- Allow learners to update their own pending results (for resubmission)
CREATE POLICY "Learners can update their own pending results"
  ON public.results FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM learners l
      WHERE l.id = results.learner_id
      AND l.user_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM learners l
      WHERE l.id = results.learner_id
      AND l.user_id = auth.uid()
    )
  );
