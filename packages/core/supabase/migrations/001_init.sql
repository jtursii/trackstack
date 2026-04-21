-- Trackstack initial schema
-- Run via: supabase db push  (or paste into the Supabase SQL editor)

create extension if not exists "uuid-ossp";

-- ── projects ─────────────────────────────────────────────────────────────────
-- One row per Ableton project folder a user has added to Trackstack.
create table public.projects (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null,
  local_path text        not null,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects: owner full access"
  on public.projects
  for all
  using     (user_id = auth.uid())
  with check (user_id = auth.uid());

create index projects_user_id_idx on public.projects (user_id);

-- ── commits ───────────────────────────────────────────────────────────────────
-- Each "push" from the desktop app creates one commit.
create table public.commits (
  id          uuid        primary key default uuid_generate_v4(),
  project_id  uuid        not null references public.projects (id) on delete cascade,
  message     text        not null,
  track_names text[]      not null default '{}',
  created_at  timestamptz not null default now()
);

alter table public.commits enable row level security;

-- Access is granted iff the parent project belongs to the calling user.
create policy "commits: owner full access via project"
  on public.commits
  for all
  using (
    exists (
      select 1 from public.projects p
      where  p.id      = commits.project_id
        and  p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where  p.id      = commits.project_id
        and  p.user_id = auth.uid()
    )
  );

create index commits_project_id_idx on public.commits (project_id);

-- ── commit_files ──────────────────────────────────────────────────────────────
-- One row per .wav file touched by a commit (new / modified / deleted).
create table public.commit_files (
  id        uuid primary key default uuid_generate_v4(),
  commit_id uuid not null references public.commits (id) on delete cascade,
  filename  text not null,
  -- enforced domain: matches the three diff statuses the Rust backend emits
  status    text not null check (status in ('new', 'modified', 'deleted')),
  s3_key    text  -- null until the file has been uploaded to object storage
);

alter table public.commit_files enable row level security;

-- Two-hop ownership check: commit_files → commits → projects → auth.users
create policy "commit_files: owner full access via commit"
  on public.commit_files
  for all
  using (
    exists (
      select 1
      from   public.commits  c
      join   public.projects p on p.id = c.project_id
      where  c.id      = commit_files.commit_id
        and  p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from   public.commits  c
      join   public.projects p on p.id = c.project_id
      where  c.id      = commit_files.commit_id
        and  p.user_id = auth.uid()
    )
  );

create index commit_files_commit_id_idx on public.commit_files (commit_id);
