-- 1. Adjust column nullability
alter table public.fuelman_reports alter column organization_id drop not null;
alter table public.fuelman_reports alter column created_by drop not null;
alter table public.fuelman_reports alter column created_by drop default;

-- 2. Clean up old restrictive policies
drop policy if exists "select own reports" on public.fuelman_reports;
drop policy if exists "insert own reports" on public.fuelman_reports;
drop policy if exists "update own reports" on public.fuelman_reports;
drop policy if exists "delete own reports" on public.fuelman_reports;
drop policy if exists "insert reports" on public.fuelman_reports;
drop policy if exists "update reports" on public.fuelman_reports;
drop policy if exists "delete reports" on public.fuelman_reports;

drop policy if exists "ritasi access" on public.fuelman_report_ritasi;
drop policy if exists "transfers access" on public.fuelman_report_transfers;
drop policy if exists "flowmeter access" on public.fuelman_report_flowmeter;
drop policy if exists "tmr access" on public.fuelman_report_tmr;

-- 3. Create new public/anonymous policies
create policy "select own reports" on public.fuelman_reports for select using (true);
create policy "insert reports" on public.fuelman_reports for insert with check (true);
create policy "update reports" on public.fuelman_reports for update using (true);
create policy "delete reports" on public.fuelman_reports for delete using (true);

create policy "ritasi access" on public.fuelman_report_ritasi for all using (true);
create policy "transfers access" on public.fuelman_report_transfers for all using (true);
create policy "flowmeter access" on public.fuelman_report_flowmeter for all using (true);
create policy "tmr access" on public.fuelman_report_tmr for all using (true);

-- 4. Update RPC to remove organization_id dependency
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
begin
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
    null, -- Organization ID removed per user request
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
