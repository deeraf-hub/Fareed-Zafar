-- Framewright: project metadata table.
-- Only timeline/settings JSON is stored here. Media files never leave the
-- user's browser. Run this in the Supabase SQL editor (or `supabase db push`).

create table if not exists public.projects (
  id               text primary key,
  user_id          uuid not null references auth.users (id) on delete cascade,
  name             text not null default 'Untitled project',
  aspect           text not null default '16:9' check (aspect in ('16:9', '9:16', '1:1')),
  duration_seconds numeric not null default 0,
  clip_count       integer not null default 0,
  data             jsonb not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists projects_user_updated_idx on public.projects (user_id, updated_at desc);

-- Keep the JSON payload within the free-tier friendly limit enforced client side (2 MB).
alter table public.projects
  drop constraint if exists projects_data_size_check;
alter table public.projects
  add constraint projects_data_size_check check (pg_column_size(data) < 2 * 1024 * 1024);

-- Per-user project cap (matches LIMITS.cloud.maxProjectsPerUser in src/config/limits.ts).
create or replace function public.enforce_project_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.projects where user_id = new.user_id) >= 50 then
    raise exception 'Project limit reached (50 per account)';
  end if;
  return new;
end $$;

drop trigger if exists projects_limit on public.projects;
create trigger projects_limit before insert on public.projects
  for each row execute function public.enforce_project_limit();

-- Row Level Security: users only ever see and modify their own rows.
alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

-- The anon/authenticated roles need table access; RLS does the filtering.
grant select, insert, update, delete on public.projects to authenticated;
