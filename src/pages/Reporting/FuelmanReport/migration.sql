-- Fuelman Report Tables
create table public.fuelman_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  report_date date not null,
  shift int not null,
  fuelman_id uuid not null,
  operator_id uuid not null,
  ft_number text not null,
  
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_fuelman_reports_org on public.fuelman_reports(organization_id);
create index idx_fuelman_reports_date on public.fuelman_reports(report_date);
create index idx_fuelman_reports_created_by on public.fuelman_reports(created_by);

create table public.fuelman_report_ritasi (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.fuelman_reports(id) on delete cascade,
  ft_number text not null,
  value numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table public.fuelman_report_transfers (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.fuelman_reports(id) on delete cascade,
  transfer_from text not null,
  transfer_out numeric(12,2) not null,
  destination text not null,
  synchronized boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.fuelman_report_flowmeter (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.fuelman_reports(id) on delete cascade,
  unit_number text not null,
  fm_awal numeric(12,2) not null,
  fm_akhir numeric(12,2) not null,
  usage numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table public.fuelman_report_tmr (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.fuelman_reports(id) on delete cascade,
  loader_id text not null,
  time_refueling text not null,
  reason text null,
  evidence_url text null,
  area_id uuid null,
  location_detail text null,
  inside_rest_time boolean not null default false,
  is_slippery boolean null,
  created_at timestamptz not null default now()
);

alter table public.fuelman_reports enable row level security;
alter table public.fuelman_report_ritasi enable row level security;
alter table public.fuelman_report_transfers enable row level security;
alter table public.fuelman_report_flowmeter enable row level security;
alter table public.fuelman_report_tmr enable row level security;

-- Policies
create policy "select own reports" on public.fuelman_reports for select using (true);
create policy "insert reports" on public.fuelman_reports for insert with check (true);
create policy "update reports" on public.fuelman_reports for update using (true);
create policy "delete reports" on public.fuelman_reports for delete using (true);

create policy "ritasi access" on public.fuelman_report_ritasi for all using (true);
create policy "transfers access" on public.fuelman_report_transfers for all using (true);
create policy "flowmeter access" on public.fuelman_report_flowmeter for all using (true);
create policy "tmr access" on public.fuelman_report_tmr for all using (true);