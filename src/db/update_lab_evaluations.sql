-- ============================================================================
--  UPDATE lab_evaluations TABLE FOR NEW LES 50-MARK SCHEME
--  Run this in your Supabase dashboard → SQL Editor → "Run".
--  Safe to re-run: every statement is a no-op if the column already exists.
-- ============================================================================

ALTER TABLE public.lab_evaluations
  ADD COLUMN IF NOT EXISTS total_classes NUMERIC,
  ADD COLUMN IF NOT EXISTS attended_classes NUMERIC,
  ADD COLUMN IF NOT EXISTS benefit_marks NUMERIC;

ALTER TABLE public.lab_evaluations
  DROP COLUMN IF EXISTS conduct;

ALTER TABLE public.lab_evaluations
  RENAME COLUMN lt TO lt_marks;
