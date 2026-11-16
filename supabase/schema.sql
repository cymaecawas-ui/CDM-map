-- Run this in the Supabase SQL Editor. Supabase uses PostgreSQL.
create extension if not exists pgcrypto;

create table if not exists public.floors (
  id smallint primary key check (id between 1 and 4),
  name text not null,
  plan_path text not null
);

insert into public.floors (id, name, plan_path) values
  (1, 'First Floor', 'public/floor-plans/floor-1.png'),
  (2, 'Second Floor', 'public/floor-plans/floor-2.png'),
  (3, 'Third Floor', 'public/floor-plans/floor-3.png'),
  (4, 'Fourth Floor', 'public/floor-plans/floor-4.png')
on conflict (id) do update set name = excluded.name, plan_path = excluded.plan_path;

create table if not exists public.rooms (
  id text primary key,
  room_name text not null,
  room_number text,
  floor_id smallint not null references public.floors(id),
  building text not null default 'Colegio de Montalban',
  room_type text not null default 'Classroom',
  capacity integer check (capacity is null or capacity >= 0),
  description text not null default '',
  polygon jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null unique,
  active boolean not null default true
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  grade_level text not null,
  section_name text not null,
  unique (grade_level, section_name)
);

-- Add administrator user IDs here after creating accounts in Supabase Auth.
create table if not exists public.administrators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  room_id text not null constraint schedules_room_id_fkey references public.rooms(id) on delete restrict,
  teacher_id uuid not null constraint schedules_teacher_id_fkey references public.teachers(id) on delete restrict,
  subject_id uuid not null constraint schedules_subject_id_fkey references public.subjects(id) on delete restrict,
  section_id uuid not null constraint schedules_section_id_fkey references public.sections(id) on delete restrict,
  day_of_week smallint not null check (day_of_week between 1 and 5),
  starts_at time not null,
  ends_at time not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists schedules_room_day_time
  on public.schedules (room_id, day_of_week, starts_at, ends_at);
create index if not exists schedules_teacher_day
  on public.schedules (teacher_id, day_of_week);
create index if not exists schedules_section_day
  on public.schedules (section_id, day_of_week);
create index if not exists schedules_subject_day
  on public.schedules (subject_id, day_of_week);

create or replace function public.is_campus_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.administrators a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_campus_admin() from public;
grant execute on function public.is_campus_admin() to anon, authenticated;

alter table public.floors enable row level security;
alter table public.rooms enable row level security;
alter table public.teachers enable row level security;
alter table public.subjects enable row level security;
alter table public.sections enable row level security;
alter table public.administrators enable row level security;
alter table public.schedules enable row level security;

-- Explicit table grants; row access is further restricted by the policies below.
revoke all on public.floors, public.rooms, public.teachers, public.subjects,
  public.sections, public.administrators, public.schedules from anon, authenticated;

grant select on public.floors, public.rooms, public.teachers, public.subjects,
  public.sections, public.schedules to anon, authenticated;

grant select on public.administrators to authenticated;

grant insert, update, delete on public.rooms, public.teachers, public.subjects,
  public.sections, public.schedules to authenticated;

drop policy if exists floors_public_read on public.floors;
create policy floors_public_read on public.floors
  for select to anon, authenticated using (true);

drop policy if exists rooms_public_read on public.rooms;
create policy rooms_public_read on public.rooms
  for select to anon, authenticated using (published);

drop policy if exists rooms_admin_all on public.rooms;
create policy rooms_admin_all on public.rooms
  for all to authenticated
  using ((select public.is_campus_admin()))
  with check ((select public.is_campus_admin()));

drop policy if exists teachers_public_read on public.teachers;
create policy teachers_public_read on public.teachers
  for select to anon, authenticated using (active);

drop policy if exists teachers_admin_all on public.teachers;
create policy teachers_admin_all on public.teachers
  for all to authenticated
  using ((select public.is_campus_admin()))
  with check ((select public.is_campus_admin()));

drop policy if exists subjects_public_read on public.subjects;
create policy subjects_public_read on public.subjects
  for select to anon, authenticated using (true);

drop policy if exists subjects_admin_all on public.subjects;
create policy subjects_admin_all on public.subjects
  for all to authenticated
  using ((select public.is_campus_admin()))
  with check ((select public.is_campus_admin()));

drop policy if exists sections_public_read on public.sections;
create policy sections_public_read on public.sections
  for select to anon, authenticated using (true);

drop policy if exists sections_admin_all on public.sections;
create policy sections_admin_all on public.sections
  for all to authenticated
  using ((select public.is_campus_admin()))
  with check ((select public.is_campus_admin()));

drop policy if exists administrators_read_self on public.administrators;
create policy administrators_read_self on public.administrators
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists schedules_public_read on public.schedules;
create policy schedules_public_read on public.schedules
  for select to anon, authenticated
  using (
    published and exists (
      select 1
      from public.rooms r
      where r.id = room_id and r.published
    )
  );

drop policy if exists schedules_admin_all on public.schedules;
create policy schedules_admin_all on public.schedules
  for all to authenticated
  using ((select public.is_campus_admin()))
  with check ((select public.is_campus_admin()));

-- Revoke API access from the administrator membership table.
-- Its read-self policy checks the signed-in user's administrator status.
revoke all on public.administrators from anon;
