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
