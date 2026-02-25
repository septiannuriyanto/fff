-- Create Issuing Table
create table public.fuelman_report_issuing (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.fuelman_reports(id) on delete cascade,
  unit_number text not null,
  jumlah_unit_support numeric(12,2) not null default 0,
  jumlah_unit_hd numeric(12,2) not null default 0,
  total_refueling numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.fuelman_report_issuing enable row level security;

-- Policies
create policy "issuing access" on public.fuelman_report_issuing for all using (true);

-- Index
create index idx_issuing_report_id on public.fuelman_report_issuing(report_id);
