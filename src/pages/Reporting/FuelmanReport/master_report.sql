-- Create Master Report Table
create table if not exists public.fuelman_master_report (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  coordinator_id uuid null, -- Removed the random uuid default to avoid fake IDs
  report_date date null,
  report_shift smallint null,
  constraint fuelman_master_report_pkey primary key (id)
) TABLESPACE pg_default;

-- Enable RLS
alter table public.fuelman_master_report enable row level security;
create policy "master_report_access" on public.fuelman_master_report for all using (true);

-- CRON JOBS SETUP (Requires pg_cron extension in Supabase)
-- Note: These run in UTC by default in Supabase. 
-- Jam 06:00 WIB = 23:00 UTC (previous day)
-- Jam 18:00 WIB = 11:00 UTC (same day)

-- Enable pg_cron
create extension if not exists pg_cron;

-- Schedule Shift 1 (06:00 WIB)
select cron.schedule(
    'fuelman_master_shift1',
    '0 23 * * *', -- 23:00 UTC = 06:00 WIB
    $$ 
       insert into public.fuelman_master_report (report_date, report_shift) 
       values (current_date + interval '1 day', 1)
    $$
);

-- Schedule Shift 2 (18:00 WIB)
select cron.schedule(
    'fuelman_master_shift2',
    '0 11 * * *', -- 11:00 UTC = 18:00 WIB
    $$ 
       insert into public.fuelman_master_report (report_date, report_shift) 
       values (current_date, 2)
    $$
);
