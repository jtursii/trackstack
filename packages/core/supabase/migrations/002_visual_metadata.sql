ALTER TABLE public.commits
  ADD COLUMN bpm float,
  ADD COLUMN clip_data jsonb,
  ADD COLUMN track_colors jsonb;
