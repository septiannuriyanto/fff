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

create or replace function public.rpc_get_battery_documentation_reports(
  p_page integer default 1,
  p_page_size integer default 50,
  p_search text default null
)
returns table (
  id uuid,
  doc_no text,
  create_date timestamptz,
  created_by_nrp text,
  created_by_name text,
  qty_ea integer,
  qty_amp numeric,
  plan_loading_date date,
  bass_numbers text,
  approval_status text,
  approved_by_name text,
  rejected_by_name text,
  processed_at timestamptz,
  remarks text,
  total_count bigint
)
language sql
security definer
set search_path = public
as $$
  with aggregated as (
    select
      r.id,
      r.doc_no,
      r.created_at as create_date,
      r.created_by_nrp,
      coalesce(m.nama, r.created_by_nrp) as created_by_name,
      count(i.id)::integer as qty_ea,
      coalesce(sum(i.ampere), 0)::numeric(12,2) as qty_amp,
      r.plan_loading_date,
      coalesce(string_agg(i.bass_reference_number, ', ' order by i.line_no), '') as bass_numbers,
      r.approval_status,
      coalesce(ma.nama, r.approved_by_nrp) as approved_by_name,
      coalesce(mr.nama, r.rejected_by_nrp) as rejected_by_name,
      coalesce(r.approved_at, r.rejected_at) as processed_at,
      r.remarks
    from public.battery_documentation_reports r
    left join public.battery_documentation_items i
      on i.report_id = r.id
    left join public.manpower m
      on m.nrp = r.created_by_nrp
    left join public.manpower ma
      on ma.nrp = r.approved_by_nrp
    left join public.manpower mr
      on mr.nrp = r.rejected_by_nrp
    group by
      r.id,
      r.doc_no,
      r.created_at,
      r.created_by_nrp,
      m.nama,
      r.plan_loading_date,
      r.approval_status,
      ma.nama,
      r.approved_by_nrp,
      r.approved_at,
      mr.nama,
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
      or doc_no ilike '%' || p_search || '%'
      or bass_numbers ilike '%' || p_search || '%'
      or created_by_name ilike '%' || p_search || '%'
      or qty_amp::text ilike '%' || p_search || '%'
      or to_char(plan_loading_date, 'YYYY-MM-DD') ilike '%' || p_search || '%'
      or to_char(plan_loading_date, 'DD Mon YYYY') ilike '%' || p_search || '%'
    )
  )
  select
    filtered.*,
    count(*) over() as total_count
  from filtered
  order by filtered.create_date desc
  offset greatest(coalesce(p_page, 1) - 1, 0) * greatest(coalesce(p_page_size, 50), 1)
  limit greatest(coalesce(p_page_size, 50), 1);
$$;

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

create or replace function public.rpc_set_battery_documentation_approval(
  p_report_id uuid,
  p_status text,
  p_actor_nrp text,
  p_remarks text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'status must be approved or rejected';
  end if;

  update public.battery_documentation_reports
  set
    approval_status = p_status,
    approved_by_nrp = case when p_status = 'approved' then p_actor_nrp else null end,
    approved_at = case when p_status = 'approved' then now() else null end,
    rejected_by_nrp = case when p_status = 'rejected' then p_actor_nrp else null end,
    rejected_at = case when p_status = 'rejected' then now() else null end,
    remarks = coalesce(p_remarks, remarks),
    updated_at = now()
  where id = p_report_id;
end;
$$;

create or replace function public.rpc_delete_battery_documentation_report(
  p_report_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.battery_documentation_reports
  where id = p_report_id;
end;
$$;

grant execute on function public.rpc_create_battery_documentation_report(text, date, text, jsonb) to authenticated;
grant execute on function public.rpc_get_battery_documentation_reports(integer, integer, text) to authenticated;
grant execute on function public.rpc_set_battery_documentation_approval(uuid, text, text) to authenticated;
grant execute on function public.rpc_delete_battery_documentation_report(uuid) to authenticated;
