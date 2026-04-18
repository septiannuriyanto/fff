create extension if not exists pgcrypto;

create table public.battery_documentation_reports (
  id uuid not null default gen_random_uuid(),
  doc_no text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_nrp text not null,
  plan_loading_date date null,
  approval_status text not null default 'pending',
  approved_by_nrp text null,
  approved_at timestamptz null,
  rejected_by_nrp text null,
  rejected_at timestamptz null,
  remarks text null,
  constraint battery_documentation_reports_pkey primary key (id),
  constraint battery_documentation_reports_doc_no_key unique (doc_no),
  constraint battery_documentation_reports_approval_status_check
    check (approval_status in ('pending', 'approved', 'rejected'))
);

create table public.battery_documentation_items (
  id uuid not null default gen_random_uuid(),
  report_id uuid not null,
  line_no integer not null,
  bass_reference_number text not null,
  classification_n integer not null,
  ampere numeric(12,2) not null,
  photo_url text not null,
  photo_path text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battery_documentation_items_pkey primary key (id),
  constraint battery_documentation_items_report_id_fkey
    foreign key (report_id) references public.battery_documentation_reports(id) on delete cascade,
  constraint battery_documentation_items_report_id_line_no_key unique (report_id, line_no),
  constraint battery_documentation_items_report_id_bass_reference_number_key unique (report_id, bass_reference_number),
  constraint battery_documentation_items_classification_n_check check (classification_n > 0),
  constraint battery_documentation_items_ampere_check check (ampere > 0)
);

create index idx_battery_documentation_reports_created_at
  on public.battery_documentation_reports (created_at desc);

create index idx_battery_documentation_reports_created_by_nrp
  on public.battery_documentation_reports (created_by_nrp);

create index idx_battery_documentation_reports_approval_status
  on public.battery_documentation_reports (approval_status);

create index idx_battery_documentation_items_report_id
  on public.battery_documentation_items (report_id);

create index idx_battery_documentation_items_bass_reference_number
  on public.battery_documentation_items (bass_reference_number);

create index idx_battery_documentation_items_classification_n
  on public.battery_documentation_items (classification_n);

create or replace view public.battery_documentation_report_list
with (security_invoker = true)
as
select
  r.id,
  r.doc_no,
  r.created_at as create_date,
  r.created_by_nrp,
  r.plan_loading_date,
  r.approval_status,
  r.approved_by_nrp,
  r.approved_at,
  r.rejected_by_nrp,
  r.rejected_at,
  count(i.id)::integer as qty_ea,
  coalesce(sum(i.ampere), 0)::numeric(12,2) as qty_amp,
  coalesce(
    string_agg(i.bass_reference_number, ', ' order by i.line_no),
    ''
  ) as bass_numbers
from public.battery_documentation_reports r
left join public.battery_documentation_items i
  on i.report_id = r.id
group by
  r.id,
  r.doc_no,
  r.created_at,
  r.created_by_nrp,
  r.plan_loading_date,
  r.approval_status,
  r.approved_by_nrp,
  r.approved_at,
  r.rejected_by_nrp,
  r.rejected_at;

alter table public.battery_documentation_reports enable row level security;
alter table public.battery_documentation_items enable row level security;

create policy "battery documentation reports select authenticated"
on public.battery_documentation_reports
for select
to authenticated
using (auth.role() = 'authenticated');

create policy "battery documentation reports insert authenticated"
on public.battery_documentation_reports
for insert
to authenticated
with check (auth.role() = 'authenticated');

create policy "battery documentation reports update authenticated"
on public.battery_documentation_reports
for update
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "battery documentation reports delete authenticated"
on public.battery_documentation_reports
for delete
to authenticated
using (auth.role() = 'authenticated');

create policy "battery documentation items select authenticated"
on public.battery_documentation_items
for select
to authenticated
using (auth.role() = 'authenticated');

create policy "battery documentation items insert authenticated"
on public.battery_documentation_items
for insert
to authenticated
with check (auth.role() = 'authenticated');

create policy "battery documentation items update authenticated"
on public.battery_documentation_items
for update
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "battery documentation items delete authenticated"
on public.battery_documentation_items
for delete
to authenticated
using (auth.role() = 'authenticated');

grant select, insert, update, delete on public.battery_documentation_reports to authenticated;
grant select, insert, update, delete on public.battery_documentation_items to authenticated;
grant select on public.battery_documentation_report_list to authenticated;
