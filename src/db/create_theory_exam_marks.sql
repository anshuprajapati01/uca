-- ============================================================================
--  CREATE theory_exam_marks TABLE
--  Run this in Supabase Dashboard -> SQL Editor -> "Run".
--  Student records live in `public.user_profiles` (role = 'student'), NOT
--  `public.users`. The blueprint's [YOUR_STUDENT_TABLE] is `user_profiles`.
--  Safe to re-run: CREATE TABLE IF NOT EXISTS is a no-op if it exists.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.theory_exam_marks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    ct1 NUMERIC,
    ct2 NUMERIC,
    put NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(student_id, subject_id)
);

-- Optional: index for faster lookups by student
CREATE INDEX IF NOT EXISTS idx_theory_exam_marks_student_id ON public.theory_exam_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_theory_exam_marks_subject_id ON public.theory_exam_marks(subject_id);
