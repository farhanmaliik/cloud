
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS student_id TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS semester TEXT,
  ADD COLUMN IF NOT EXISTS contact TEXT,
  ADD COLUMN IF NOT EXISTS university_email TEXT;

CREATE OR REPLACE FUNCTION public.borrow_book(
  _book_id uuid,
  _full_name text DEFAULT NULL,
  _student_id text DEFAULT NULL,
  _department text DEFAULT NULL,
  _semester text DEFAULT NULL,
  _contact text DEFAULT NULL,
  _university_email text DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _loan_id UUID;
  _avail INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF _full_name IS NULL OR length(btrim(_full_name)) = 0
     OR _student_id IS NULL OR length(btrim(_student_id)) = 0
     OR _department IS NULL OR length(btrim(_department)) = 0
     OR _semester IS NULL OR length(btrim(_semester)) = 0
     OR _contact IS NULL OR length(btrim(_contact)) = 0
     OR _university_email IS NULL OR length(btrim(_university_email)) = 0 THEN
    RAISE EXCEPTION 'All borrower details are required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.loans WHERE book_id = _book_id AND user_id = _uid AND returned_at IS NULL) THEN
    RAISE EXCEPTION 'You already borrowed this book';
  END IF;

  UPDATE public.books SET available_copies = available_copies - 1
  WHERE id = _book_id AND available_copies > 0
  RETURNING available_copies INTO _avail;

  IF _avail IS NULL THEN RAISE EXCEPTION 'No copies available'; END IF;

  INSERT INTO public.loans (
    book_id, user_id, full_name, student_id, department, semester, contact, university_email
  ) VALUES (
    _book_id, _uid, btrim(_full_name), btrim(_student_id), btrim(_department),
    btrim(_semester), btrim(_contact), btrim(_university_email)
  )
  RETURNING id INTO _loan_id;
  RETURN _loan_id;
END; $function$;
