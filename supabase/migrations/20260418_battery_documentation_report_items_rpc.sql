create or replace function public.rpc_get_battery_documentation_report_items(
  p_report_id uuid
)
returns table (
  id uuid,
  line_no integer,
  bass_reference_number text,
  classification_n integer,
  ampere numeric,
  photo_url text,
  photo_path text,
  notes text
)
language sql
security definer
set search_path = public
as $$
  select
    i.id,
    i.line_no,
    i.bass_reference_number,
    i.classification_n,
    i.ampere,
    i.photo_url,
    i.photo_path,
    i.notes
  from public.battery_documentation_items i
  where i.report_id = p_report_id
  order by i.line_no asc;
$$;

grant execute on function public.rpc_get_battery_documentation_report_items(uuid) to authenticated;

drop policy if exists "battery documentation reports update authenticated"
on public.battery_documentation_reports;

create policy "battery documentation reports update authenticated"
on public.battery_documentation_reports
for update
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
