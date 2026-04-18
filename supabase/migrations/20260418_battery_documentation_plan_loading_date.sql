update public.battery_documentation_reports
set plan_loading_date = created_at::date
where plan_loading_date is null;

alter table public.battery_documentation_reports
alter column plan_loading_date set not null;

create or replace function public.rpc_create_battery_documentation_report(
  p_created_by_nrp text,
  p_plan_loading_date date default null,
  p_remarks text default null,
  p_items jsonb default '[]'::jsonb
)
returns table (
  report_id uuid,
  doc_no text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id uuid := gen_random_uuid();
  v_doc_no text := 'BDR-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(v_report_id::text, '-', ''), 1, 6));
begin
  if coalesce(trim(p_created_by_nrp), '') = '' then
    raise exception 'created_by_nrp is required';
  end if;

  if p_plan_loading_date is null then
    raise exception 'plan_loading_date is required';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty json array';
  end if;

  insert into public.battery_documentation_reports (
    id,
    doc_no,
    created_by_nrp,
    plan_loading_date,
    remarks
  )
  values (
    v_report_id,
    v_doc_no,
    p_created_by_nrp,
    p_plan_loading_date,
    p_remarks
  );

  insert into public.battery_documentation_items (
    report_id,
    line_no,
    bass_reference_number,
    classification_n,
    ampere,
    photo_url,
    photo_path,
    notes
  )
  select
    v_report_id,
    coalesce((item.value ->> 'line_no')::integer, item.ordinality::integer),
    trim(item.value ->> 'bass_reference_number'),
    (regexp_replace(coalesce(item.value ->> 'classification_n', ''), '[^0-9]', '', 'g'))::integer,
    (item.value ->> 'ampere')::numeric(12,2),
    trim(item.value ->> 'photo_url'),
    nullif(trim(item.value ->> 'photo_path'), ''),
    nullif(trim(item.value ->> 'notes'), '')
  from jsonb_array_elements(p_items) with ordinality as item(value, ordinality);

  return query
  select v_report_id, v_doc_no;
end;
$$;

grant execute on function public.rpc_create_battery_documentation_report(text, date, text, jsonb) to authenticated;
