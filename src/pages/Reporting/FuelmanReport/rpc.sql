create or replace function public.create_fuelman_report(
  p_report_date date,
  p_report_shift int,
  p_fuelman_id uuid,
  p_operator_id uuid,
  p_ft_number text,
  p_ritasi jsonb,
  p_transfers jsonb,
  p_flowmeter jsonb,
  p_tmr jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_report_id uuid;
  v_organization_id uuid;
begin
  -- Fetch organization_id from manpower
  select organization_id into v_organization_id 
  from public.manpower 
  where user_id = p_fuelman_id
  limit 1;

  if v_organization_id is null then
    raise exception 'Organization ID not found for fuelman %', p_fuelman_id;
  end if;
  -- 1. Insert Master Report
  insert into public.fuelman_reports (
    organization_id,
    report_date,
    shift,
    fuelman_id,
    operator_id,
    ft_number,
    created_by
  )
  values (
    v_organization_id,
    p_report_date,
    p_report_shift,
    p_fuelman_id,
    p_operator_id,
    p_ft_number,
    auth.uid()
  )
  returning id into v_report_id;

  -- 2. Insert Ritasi
  if p_ritasi is not null and jsonb_array_length(p_ritasi) > 0 then
    insert into public.fuelman_report_ritasi (
      report_id,
      ft_number,
      value
    )
    select
      v_report_id,
      (x->>'ft_number'),
      (x->>'value')::numeric
    from jsonb_array_elements(p_ritasi) as x;
  end if;

  -- 3. Insert Transfers
  if p_transfers is not null and jsonb_array_length(p_transfers) > 0 then
    insert into public.fuelman_report_transfers (
      report_id,
      transfer_from,
      transfer_out,
      destination,
      synchronized
    )
    select
      v_report_id,
      (x->>'transfer_from'),
      (x->>'transfer_out')::numeric,
      (x->>'destination'),
      (x->>'synchronized')::boolean
    from jsonb_array_elements(p_transfers) as x;
  end if;

  -- 4. Insert Flowmeter
  if p_flowmeter is not null and jsonb_array_length(p_flowmeter) > 0 then
    insert into public.fuelman_report_flowmeter (
      report_id,
      unit_number,
      fm_awal,
      fm_akhir,
      usage
    )
    select
      v_report_id,
      (x->>'unit_number'),
      (x->>'fm_awal')::numeric,
      (x->>'fm_akhir')::numeric,
      (x->>'usage')::numeric
    from jsonb_array_elements(p_flowmeter) as x;
  end if;

  -- 5. Insert TMR
  if p_tmr is not null and jsonb_array_length(p_tmr) > 0 then
    insert into public.fuelman_report_tmr (
      report_id,
      loader_id,
      time_refueling,
      reason,
      evidence_url,
      area_id,
      location_detail,
      inside_rest_time,
      is_slippery
    )
    select
      v_report_id,
      (x->>'loader_id'),
      (x->>'time_refueling'),
      nullif(x->>'reason', ''),
      nullif(x->>'evidence_url', ''),
      (nullif(x->>'area_id', '')::uuid),
      nullif(x->>'location_detail', ''),
      (x->>'inside_rest_time')::boolean,
      (x->>'is_slippery')::boolean
    from jsonb_array_elements(p_tmr) as x;
  end if;

  return v_report_id;
end;
$$;

grant execute on function public.create_fuelman_report to authenticated, anon;
