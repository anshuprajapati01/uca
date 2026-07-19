-- ============================================================================
--  EMERGENCY MIGRATION — RUN THIS IN THE SUPABASE SQL EDITOR
-- ============================================================================
--  The period-based Extra Attendance columns were never applied to the live
--  database, causing a 400: "column extra_attendance.start_time does not exist".
--  The application's anon key cannot run DDL, so paste & run the block below in
--  your Supabase dashboard -> SQL Editor, then click "Run".
--  Safe to re-run: every statement is a no-op if the column already exists.
--
--  ALTER TABLE extra_attendance
--  ADD COLUMN IF NOT EXISTS is_full_day BOOLEAN DEFAULT TRUE,
--  ADD COLUMN IF NOT EXISTS start_time TIME,
--  ADD COLUMN IF NOT EXISTS end_time TIME,
--  ADD COLUMN IF NOT EXISTS duration_periods INTEGER DEFAULT 7;
-- ============================================================================


-- Class Representatives Table
-- Stores which student is the CR for a specific year, branch, and semester

create table if not exists class_representatives (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references user_profiles(id) on delete cascade,
    branch text not null,
    year text not null,
    semester integer not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(student_id, branch, year, semester)
);

-- Indexes for efficient queries
create index if not exists idx_class_representatives_branch_year_semester on class_representatives(branch, year, semester);
create index if not exists idx_class_representatives_student_id on class_representatives(student_id);

-- Timetable Configs Table
-- Stores per branch/semester/year metadata (W.E.F. date and default room) so it persists across refreshes

create table if not exists timetable_configs (
    id uuid primary key default gen_random_uuid(),
    branch text not null,
    semester integer not null,
    year text not null,
    wef_date date,
    room_no text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(branch, semester, year)
);

create index if not exists idx_timetable_configs_branch_semester_year on timetable_configs(branch, semester, year);

-- System Settings Table
-- Stores global academic configuration such as semester start dates

create table if not exists system_settings (
    id uuid primary key default gen_random_uuid(),
    department text not null,
    semester_start_date date not null,
    is_active boolean default true,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(department)
);

create index if not exists idx_system_settings_department on system_settings(department);
create index if not exists idx_system_settings_active on system_settings(is_active);

-- Section Mentors Table
-- Maps a faculty mentor to a specific branch + year + section combination

create table if not exists section_mentors (
    id uuid primary key default gen_random_uuid(),
    branch text not null,
    year text not null,
    section text not null,
    faculty_id uuid references user_profiles(id) on delete set null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(branch, year, section)
);

create index if not exists idx_section_mentors_branch_year_section on section_mentors(branch, year, section);

-- Extra Attendance Table
-- Stores extra-curricular / mentor activity attendance per student per date

create table if not exists extra_attendance (
    id uuid primary key default gen_random_uuid(),
    date date not null,
    student_roll text not null,
    activity_type text not null,
    status text not null,
    is_full_day boolean not null default true,
    start_time time,
    end_time time,
    duration_periods integer not null default 7,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(date, student_roll, activity_type, duration_periods, start_time)
);

create index if not exists idx_extra_attendance_date_roll_activity on extra_attendance(date, student_roll, activity_type, duration_periods, start_time);

-- Migration: add duration columns to an already-existing extra_attendance table.
-- Safe to re-run; each statement is a no-op if the column/index already exists.
do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_name = 'extra_attendance' and column_name = 'is_full_day'
    ) then
        alter table extra_attendance add column is_full_day boolean not null default true;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_name = 'extra_attendance' and column_name = 'start_time'
    ) then
        alter table extra_attendance add column start_time time;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_name = 'extra_attendance' and column_name = 'end_time'
    ) then
        alter table extra_attendance add column end_time time;
    end if;

    if not exists (
        select 1 from information_schema.columns
        where table_name = 'extra_attendance' and column_name = 'duration_periods'
    ) then
        alter table extra_attendance add column duration_periods integer not null default 7;
    end if;
end $$;