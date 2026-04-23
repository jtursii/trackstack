ALTER TABLE public.commits
  ADD COLUMN committed_by_email text,
  ADD COLUMN committed_by_avatar text;
