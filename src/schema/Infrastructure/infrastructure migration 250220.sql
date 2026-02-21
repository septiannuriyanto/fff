create table public.infra_backlog_photos (
  id uuid not null default extensions.uuid_generate_v4 (),
  backlog_id uuid null,
  photo_url text null,
  created_at timestamp with time zone null default now(),
  constraint infra_backlog_photos_pkey primary key (id),
  constraint infra_backlog_photos_backlog_id_fkey foreign KEY (backlog_id) references infra_backlogs (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_backlog_photo on public.infra_backlog_photos using btree (backlog_id) TABLESPACE pg_default;

create table public.infra_backlogs (
  id uuid not null default extensions.uuid_generate_v4 (),
  item_id uuid null,
  location_id uuid null,
  title text null,
  description text null,
  risk_score integer null,
  status public.backlog_status null default 'open'::backlog_status,
  due_date date null,
  closed_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  infra_population_id uuid null,
  constraint infra_backlogs_pkey primary key (id),
  constraint infra_backlogs_infra_population_id_fkey foreign KEY (infra_population_id) references infra_population (id),
  constraint infra_backlogs_item_id_fkey foreign KEY (item_id) references infra_inspection_items (id) on update CASCADE on delete CASCADE,
  constraint infra_backlogs_location_id_fkey foreign KEY (location_id) references infra_locations (id)
) TABLESPACE pg_default;

create index IF not exists idx_backlog_status on public.infra_backlogs using btree (status) TABLESPACE pg_default;

create index IF not exists idx_backlog_due on public.infra_backlogs using btree (due_date) TABLESPACE pg_default;

create index IF not exists idx_backlog_location on public.infra_backlogs using btree (location_id) TABLESPACE pg_default;

create index IF not exists idx_backlog_item on public.infra_backlogs using btree (item_id) TABLESPACE pg_default;

create table public.infra_inspection_items (
  id uuid not null default extensions.uuid_generate_v4 (),
  inspection_id uuid null,
  description text null,
  is_ok boolean null,
  risk_score integer null,
  created_at timestamp with time zone null default now(),
  photo_url text null,
  infra_location_items_id uuid null,
  constraint infra_inspection_items_pkey primary key (id),
  constraint infra_inspection_items_infra_location_items_id_fkey foreign KEY (infra_location_items_id) references infra_locations_items (id) on delete set null,
  constraint infra_inspection_items_inspection_id_fkey foreign KEY (inspection_id) references infra_inspections (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_item_inspection on public.infra_inspection_items using btree (inspection_id) TABLESPACE pg_default;

create index IF not exists idx_item_risk on public.infra_inspection_items using btree (risk_score) TABLESPACE pg_default;

create trigger trg_auto_backlog
after INSERT on infra_inspection_items for EACH row
execute FUNCTION fn_create_backlog ();

create table public.infra_inspections (
  id uuid not null default extensions.uuid_generate_v4 (),
  schedule_id uuid null,
  location_id uuid null,
  inspector_id text null,
  inspection_date date not null,
  status public.inspection_status null default 'draft'::inspection_status,
  created_at timestamp with time zone null default now(),
  infra_population_id uuid null,
  constraint infra_inspections_pkey primary key (id),
  constraint infra_inspections_infra_population_id_fkey foreign KEY (infra_population_id) references infra_population (id),
  constraint infra_inspections_inspector_id_fkey foreign KEY (inspector_id) references manpower (nrp),
  constraint infra_inspections_location_id_fkey foreign KEY (location_id) references infra_locations (id),
  constraint infra_inspections_schedule_id_fkey foreign KEY (schedule_id) references infra_schedules (id)
) TABLESPACE pg_default;

create index IF not exists idx_inspection_location on public.infra_inspections using btree (location_id) TABLESPACE pg_default;

create index IF not exists idx_inspection_schedule on public.infra_inspections using btree (schedule_id) TABLESPACE pg_default;

create index IF not exists idx_inspection_date on public.infra_inspections using btree (inspection_date) TABLESPACE pg_default;

create index IF not exists idx_inspection_status on public.infra_inspections using btree (status) TABLESPACE pg_default;

create table public.infra_item_photos (
  id uuid not null default extensions.uuid_generate_v4 (),
  item_id uuid null,
  photo_url text not null,
  taken_at timestamp with time zone null default now(),
  constraint infra_item_photos_pkey primary key (id),
  constraint infra_item_photos_item_id_key unique (item_id),
  constraint infra_item_photos_item_id_fkey foreign KEY (item_id) references infra_inspection_items (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_photo_item on public.infra_item_photos using btree (item_id) TABLESPACE pg_default;

create table public.infra_locations (
  id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  area text null,
  created_at timestamp with time zone null default now(),
  banner_url text null,
  constraint infra_locations_pkey primary key (id)
) TABLESPACE pg_default;

create table public.infra_locations_items (
  infra_locations_id uuid not null default gen_random_uuid (),
  infra_category_id uuid null default gen_random_uuid (),
  name text null,
  description text null,
  example_photo text null,
  risk_score smallint null,
  id uuid not null default extensions.uuid_generate_v4 (),
  constraint infra_locations_items_pkey primary key (id),
  constraint infra_locations_items_infra_category_id_fkey foreign KEY (infra_category_id) references infra_locations_items_category (id),
  constraint infra_locations_items_infra_locations_id_fkey foreign KEY (infra_locations_id) references infra_locations (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create table public.infra_locations_items_category (
  name text not null default ''::text,
  id uuid not null default extensions.uuid_generate_v4 (),
  constraint infra_locations_items_category_pkey primary key (id)
) TABLESPACE pg_default;

create table public.infra_population (
  id uuid not null default gen_random_uuid (),
  infra_locations_id uuid null default gen_random_uuid (),
  population_name text null,
  active boolean null default true,
  queue_num smallint null,
  constraint infra_population_pkey primary key (id)
) TABLESPACE pg_default;

create table public.infra_schedules (
  id uuid not null default extensions.uuid_generate_v4 (),
  location_id uuid null,
  period integer null,
  start_date date not null,
  end_date date not null,
  status text null default 'open'::text,
  created_at timestamp with time zone null default now(),
  constraint infra_schedules_pkey primary key (id),
  constraint infra_schedules_location_id_fkey foreign KEY (location_id) references infra_locations (id),
  constraint infra_schedules_period_check check (
    (
      (period >= 1)
      and (period <= 10)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_schedule_location on public.infra_schedules using btree (location_id) TABLESPACE pg_default;

create index IF not exists idx_schedule_period on public.infra_schedules using btree (period) TABLESPACE pg_default;