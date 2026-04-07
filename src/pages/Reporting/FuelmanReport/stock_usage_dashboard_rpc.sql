create or replace function public.get_fuel_stock_management_monthly(
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_stock jsonb;
  v_usage jsonb;
  v_ritasi jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  into v_stock
  from (
    select
      fr.report_date as date,
      fs.unit_number,
      coalesce(st.warehouse_id, fs.unit_number) as warehouse_id,
      sum(coalesce(fs.qty_awal, 0)) as qty_awal,
      sum(coalesce(fs.qty_akhir, 0)) as qty_akhir
    from public.fuelman_reports fr
    join public.fuelman_report_stock fs
      on fs.report_id = fr.id
    left join public.storage st
      on st.unit_id = fs.unit_number
    where fr.report_date between p_start_date and p_end_date
      and fr.shift = 1
    group by fr.report_date, fs.unit_number, st.warehouse_id
    order by fr.report_date, coalesce(st.warehouse_id, fs.unit_number)
  ) t;

  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  into v_usage
  from (
    select
      lv.issued_date as date,
      lv.warehouse_code,
      sum(coalesce(lv.qty, 0)) as qty
    from public.loto_verification lv
    where lv.issued_date between p_start_date and p_end_date
      and lv.shift = 2
      and coalesce(lv.is_included, true) = true
    group by lv.issued_date, lv.warehouse_code
    order by lv.issued_date, lv.warehouse_code
  ) t;

  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  into v_ritasi
  from (
    select
      rf.ritation_date as date,
      rf.warehouse_id,
      sum(coalesce(rf.qty_sj, 0)) as value
    from public.ritasi_fuel rf
    where rf.ritation_date between p_start_date and p_end_date
    group by rf.ritation_date, rf.warehouse_id
    order by rf.ritation_date, rf.warehouse_id
  ) t;

  return jsonb_build_object(
    'stock', v_stock,
    'usage', v_usage,
    'ritasi', v_ritasi
  );
end;
$$;

grant execute on function public.get_fuel_stock_management_monthly to authenticated, anon;

create or replace function public.get_first_stock_milestone_raw_monthly(
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_stock jsonb;
  v_usage jsonb;
  v_ritasi jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  into v_stock
  from (
    select
      fr.report_date as date,
      fr.shift,
      fs.unit_number,
      coalesce(st.warehouse_id, fs.unit_number) as warehouse_id,
      st.unit_id,
      sum(coalesce(fs.qty_awal, 0)) as qty_awal,
      sum(coalesce(fs.qty_akhir, 0)) as qty_akhir
    from public.fuelman_reports fr
    join public.fuelman_report_stock fs
      on fs.report_id = fr.id
    left join public.storage st
      on st.unit_id = fs.unit_number
    where fr.report_date between p_start_date and p_end_date
    group by fr.report_date, fr.shift, fs.unit_number, st.warehouse_id, st.unit_id
    order by fr.report_date, fr.shift, coalesce(st.warehouse_id, fs.unit_number)
  ) t;

  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  into v_usage
  from (
    select
      lv.issued_date as date,
      lv.shift,
      lv.warehouse_code as warehouse_id,
      st.unit_id,
      sum(coalesce(lv.qty, 0)) as qty
    from public.loto_verification lv
    left join public.storage st
      on st.warehouse_id = lv.warehouse_code
    where lv.issued_date between p_start_date and p_end_date
      and coalesce(lv.is_included, true) = true
    group by lv.issued_date, lv.shift, lv.warehouse_code, st.unit_id
    order by lv.issued_date, lv.shift, lv.warehouse_code
  ) t;

  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  into v_ritasi
  from (
    select
      rf.ritation_date as date,
      rf.shift,
      rf.warehouse_id,
      st.unit_id,
      rf.no_surat_jalan,
      sum(coalesce(rf.qty_sj, 0)) as value
    from public.ritasi_fuel rf
    left join public.storage st
      on st.warehouse_id = rf.warehouse_id
    where rf.ritation_date between p_start_date and p_end_date
    group by rf.ritation_date, rf.shift, rf.warehouse_id, st.unit_id, rf.no_surat_jalan
    order by rf.ritation_date, rf.shift, rf.warehouse_id, rf.no_surat_jalan
  ) t;

  return jsonb_build_object(
    'stock', v_stock,
    'usage', v_usage,
    'ritasi', v_ritasi
  );
end;
$$;

grant execute on function public.get_first_stock_milestone_raw_monthly to authenticated, anon;
