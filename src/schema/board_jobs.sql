-- Create ENUM for job status (if not exists)
DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create board_jobs table
CREATE TABLE public.board_jobs (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text null,
  status public.job_status null default 'pending'::job_status,
  scheduled_date date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  assignee_id text null,
  created_by text null,
  due_date date null,
  constraint board_jobs_pkey primary key (id),
  constraint board_jobs_assignee_id_fkey foreign KEY (assignee_id) references manpower (nrp),
  constraint board_jobs_created_by_fkey foreign KEY (created_by) references manpower (nrp)
) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.board_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read
CREATE POLICY "Enable read access for all users" ON public.board_jobs
    FOR SELECT USING (true);

-- Policy: Only authenticated users can insert
CREATE POLICY "Enable insert for authenticated users" ON public.board_jobs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only authenticated users can update
CREATE POLICY "Enable update for authenticated users" ON public.board_jobs
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Only authenticated users can delete
CREATE POLICY "Enable delete for authenticated users" ON public.board_jobs
    FOR DELETE USING (auth.role() = 'authenticated');
