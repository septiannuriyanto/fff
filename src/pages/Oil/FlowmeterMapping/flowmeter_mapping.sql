create table if not exists public.flowmeter_mapping (
  id uuid not null default gen_random_uuid (),
  warehouse_code text null,
  material_type text null,
  location text null,
  serial_number text null,
  type text null,
  function text null,
  front_photo_url text null,
  recorded_at timestamp with time zone not null default now(),
  sn_photo_url text null,
  constraint flowmeter_mapping_pkey primary key (id)
) TABLESPACE pg_default;

alter table public.flowmeter_mapping
  add column if not exists warehouse_code text null,
  add column if not exists material_type text null,
  add column if not exists location text null,
  add column if not exists serial_number text null,
  add column if not exists type text null,
  add column if not exists function text null,
  add column if not exists front_photo_url text null,
  add column if not exists recorded_at timestamp with time zone not null default now(),
  add column if not exists sn_photo_url text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'flowmeter_mapping_serial_number_key'
      and conrelid = 'public.flowmeter_mapping'::regclass
  ) then
    alter table public.flowmeter_mapping
      add constraint flowmeter_mapping_serial_number_key unique (serial_number);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'flowmeter_mapping_material_type_check'
      and conrelid = 'public.flowmeter_mapping'::regclass
  ) then
    alter table public.flowmeter_mapping
      add constraint flowmeter_mapping_material_type_check
      check (material_type in ('FUEL', 'OIL'));
  end if;
end $$;
