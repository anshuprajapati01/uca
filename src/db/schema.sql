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