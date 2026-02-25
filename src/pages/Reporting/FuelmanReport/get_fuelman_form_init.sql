-- Single-call init function for FuelmanReport form
-- Combines: master report lookup + fuelmen + operators + FT units + areas
-- Reduces 4 HTTP round-trips to 1

create or replace function public.get_fuelman_form_init(
  p_date date,
  p_shift int
)
returns json
language plpgsql
security definer
as $$
declare
  v_master  json;
  v_fuelmen json;
  v_ops     json;
  v_fts     json;
  v_areas   json;
begin
  -- 1. Master report for this date+shift
  select row_to_json(m)
    into v_master
    from public.fuelman_master_report m
   where m.report_date = p_date
     and m.report_shift = p_shift
   limit 1;

  -- 2. Fuelmen (position = 5)
  select json_agg(json_build_object('user_id', m.user_id, 'nama', m.nama) order by m.nama)
    into v_fuelmen
    from public.manpower m
   where m.position = 5
     and m.active = true
     and m.registered = true;

  -- 3. Operators (position = 4)
  select json_agg(json_build_object('user_id', m.user_id, 'nama', m.nama) order by m.nama)
    into v_ops
    from public.manpower m
   where m.position = 4
     and m.active = true
     and m.registered = true;

  -- 4. FT units (active in storage)
  select json_agg(s.unit_id order by s.warehouse_id)
    into v_fts
    from public.storage s
   where s.status <> 'OUT';

  -- 5. Areas
  select json_agg(json_build_object('id', a.id, 'major_area', a.major_area) order by a.major_area)
    into v_areas
    from public.area a
   where a.major_area is not null;

  return json_build_object(
    'master',    v_master,   -- null if not found
    'fuelmen',   coalesce(v_fuelmen, '[]'::json),
    'operators', coalesce(v_ops,     '[]'::json),
    'fts',       coalesce(v_fts,     '[]'::json),
    'areas',     coalesce(v_areas,   '[]'::json)
  );
end;
$$;

grant execute on function public.get_fuelman_form_init to authenticated, anon;
