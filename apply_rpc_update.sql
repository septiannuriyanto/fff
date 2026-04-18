create or replace function public.rpc_set_battery_documentation_approval(
  p_report_id uuid,
  p_status text,
  p_processor_nrp text,
  p_remarks text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status = 'approved' then
    update public.battery_documentation_reports
    set 
      approval_status = 'approved',
      processed_at = now(),
      approved_by_nrp = p_processor_nrp,
      approved_at = now(),
      rejected_by_nrp = null,
      rejected_at = null,
      remarks = p_remarks
    where id = p_report_id;
  elsif p_status = 'rejected' then
    update public.battery_documentation_reports
    set 
      approval_status = 'rejected',
      processed_at = now(),
      rejected_by_nrp = p_processor_nrp,
      rejected_at = now(),
      approved_by_nrp = null,
      approved_at = null,
      remarks = p_remarks
    where id = p_report_id;
  else
    raise exception 'Invalid status: %', p_status;
  end if;
end;
$$;

grant execute on function public.rpc_set_battery_documentation_approval(uuid, text, text, text) to authenticated;

create or replace function public.rpc_get_battery_documentation_reports(
  p_page integer default 1,
  p_page_size integer default 50,
  p_search text default null,
  p_status_filter text[] default null
)
returns table (
  id uuid,
  doc_no text,
  approval_status text,
  create_date timestamptz,
  processed_at timestamptz,
  plan_loading_date date,
  created_by_nrp text,
  created_by_name text,
  bass_numbers text,
  items jsonb,
  approved_by_nrp text,
  approved_at timestamptz,
  approved_by_name text,
  rejected_by_nrp text,
  rejected_at timestamptz,
  remarks text,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with aggregated as (
    select
      r.id,
      r.doc_no,
      r.approval_status,
      r.created_at as create_date,
      r.processed_at,
      r.plan_loading_date,
      r.created_by_nrp,
      mc.nama as created_by_name,
      string_agg(i.bass_reference_number, ', ') as bass_numbers,
      jsonb_agg(jsonb_build_object(
        'line_no', i.line_no,
        'bass_reference_number', i.bass_reference_number,
        'classification_n', i.classification_n,
        'ampere', i.ampere,
        'photo_url', i.photo_url,
        'photo_path', i.photo_path,
        'notes', i.notes
      ) order by i.line_no) as items,
      r.approved_by_nrp,
      r.approved_at,
      ma.nama as approved_by_name,
      r.rejected_by_nrp,
      r.rejected_at,
      r.remarks
    from public.battery_documentation_reports r
    left join public.battery_documentation_items i on i.report_id = r.id
    left join public.manpower mc on mc.nrp = r.created_by_nrp
    left join public.manpower ma on ma.nrp = r.approved_by_nrp
    where r.deleted_at is null
      and (p_status_filter is null or r.approval_status = any(p_status_filter))
    group by 
      r.id, 
      r.doc_no, 
      r.approval_status, 
      r.created_at, 
      r.processed_at, 
      r.plan_loading_date, 
      r.created_by_nrp, 
      mc.nama,
      r.approved_by_nrp,
      r.approved_at,
      ma.nama,
      r.rejected_by_nrp,
      r.rejected_at,
      r.remarks
  ),
  filtered as (
    select *
    from aggregated
    where (
      p_search is null
      or p_search = ''
      or aggregated.doc_no ilike '%' || p_search || '%'
      or aggregated.bass_numbers ilike '%' || p_search || '%'
      or aggregated.created_by_name ilike '%' || p_search || '%'
      or to_char(aggregated.plan_loading_date, 'YYYY-MM-DD') ilike '%' || p_search || '%'
    )
  )
  select
    filtered.*,
    count(*) over() as total_count
  from filtered
  order by filtered.create_date desc
  offset greatest(coalesce(p_page, 1) - 1, 0) * greatest(coalesce(p_page_size, 50), 1)
  limit greatest(coalesce(p_page_size, 50), 1);
end;
$$;

grant execute on function public.rpc_get_battery_documentation_reports(integer, integer, text, text[]) to authenticated;

create or replace function public.rpc_delete_battery_documentation_report(
  p_report_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.battery_documentation_reports
  set deleted_at = now()
  where id = p_report_id;
end;
$$;

grant execute on function public.rpc_delete_battery_documentation_report(uuid) to authenticated;

create or replace function public.rpc_update_battery_documentation_report(
  p_report_id uuid,
  p_plan_loading_date date,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Update header
  update public.battery_documentation_reports
  set
    plan_loading_date = p_plan_loading_date,
    approval_status = 'resubmitted',
    rejected_by_nrp = null,
    rejected_at = null,
    updated_at = now()
  where id = p_report_id;

  -- Delete items
  delete from public.battery_documentation_items
  where report_id = p_report_id;

  -- Insert items
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
    p_report_id,
    coalesce((item.value ->> 'line_no')::integer, item.ordinality::integer),
    trim(item.value ->> 'bass_reference_number'),
    (regexp_replace(coalesce(item.value ->> 'classification_n', ''), '[^0-9]', '', 'g'))::integer,
    (item.value ->> 'ampere')::numeric(12,2),
    trim(item.value ->> 'photo_url'),
    nullif(trim(item.value ->> 'photo_path'), ''),
    nullif(trim(item.value ->> 'notes'), '')
  from jsonb_array_elements(p_items) with ordinality as item(value, ordinality);
end;
$$;

grant execute on function public.rpc_update_battery_documentation_report(uuid, date, jsonb) to authenticated;

-- Add missing foreign key if it doesn't exist
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'battery_documentation_reports_created_by_nrp_fkey') then
    alter table public.battery_documentation_reports
    add constraint battery_documentation_reports_created_by_nrp_fkey
    foreign key (created_by_nrp)
    references public.manpower(nrp);
  end if;
end;
$$;

-- Add deleted_at if missing
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'battery_documentation_reports' and column_name = 'deleted_at') then
    alter table public.battery_documentation_reports add column deleted_at timestamptz;
  end if;
end;
$$;

-- Add processed_at if missing
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'battery_documentation_reports' and column_name = 'processed_at') then
    alter table public.battery_documentation_reports add column processed_at timestamptz;
  end if;
end;
$$;
EOF

