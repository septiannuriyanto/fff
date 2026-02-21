-- =========================================
-- EXTENSION
-- =========================================
create extension if not exists "uuid-ossp";

-- =========================================
-- ENUM
-- =========================================
do $$ begin
    create type inspection_status as enum ('draft', 'submitted', 'closed');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type backlog_status as enum ('open', 'progress', 'closed');
exception
    when duplicate_object then null;
end $$;

-- =========================================
-- MASTER LOKASI
-- =========================================
create table infra_locations (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    area text,
    created_at timestamptz default now()
);

-- =========================================
-- SCHEDULE
-- =========================================
create table infra_schedules (
    id uuid primary key default uuid_generate_v4(),
    location_id uuid references infra_locations(id),
    period int check (period between 1 and 10),
    start_date date not null,
    end_date date not null,
    status text default 'open',
    created_at timestamptz default now()
);

create index idx_schedule_location on infra_schedules(location_id);
create index idx_schedule_period on infra_schedules(period);

-- =========================================
-- INSPECTION HEADER
-- =========================================
create table infra_inspections (
    id uuid primary key default uuid_generate_v4(),
    schedule_id uuid references infra_schedules(id),
    location_id uuid references infra_locations(id),
    inspector_id text references manpower(nrp),
    inspection_date date not null,
    status inspection_status default 'draft',
    created_at timestamptz default now()
);

create index idx_inspection_location on infra_inspections(location_id);
create index idx_inspection_schedule on infra_inspections(schedule_id);
create index idx_inspection_date on infra_inspections(inspection_date);

-- =========================================
-- MASTER DATA: INSPECTION ITEM CATEGORIES
-- =========================================
create table infra_locations_items_category (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    created_at timestamptz default now()
);

-- =========================================
-- MASTER DATA: INSPECTION ITEMS PER LOCATION
-- =========================================
create table infra_locations_items (
    id uuid primary key default uuid_generate_v4(),
    infra_locations_id uuid references infra_locations(id) on delete cascade,
    infra_category_id uuid references infra_locations_items_category(id) on delete set null,
    name text,
    description text,
    example_photo text,
    risk_score smallint check (risk_score between 1 and 5),
    created_at timestamptz default now()
);

create index idx_loc_items_location on infra_locations_items(infra_locations_id);
create index idx_loc_items_category on infra_locations_items(infra_category_id);

-- =========================================
-- INSPECTION RESULTS (ITEMS PER INSPECTION)
-- =========================================
create table infra_inspection_items (
    id uuid primary key default uuid_generate_v4(),
    inspection_id uuid references infra_inspections(id) on delete cascade,
    description text,
    is_ok boolean,
    risk_score int,
    master_item_id uuid references infra_locations_items(id) on delete set null,
    created_at timestamptz default now()
);

create index idx_item_inspection on infra_inspection_items(inspection_id);

-- =========================================
-- FOTO ITEM (1 ITEM = 1 FOTO)
-- =========================================
create table infra_item_photos (
    id uuid primary key default uuid_generate_v4(),
    item_id uuid unique references infra_inspection_items(id) on delete cascade,
    photo_url text not null,
    taken_at timestamptz default now()
);

create index idx_photo_item on infra_item_photos(item_id);

-- =========================================
-- BACKLOG
-- =========================================
create table infra_backlogs (
    id uuid primary key default uuid_generate_v4(),
    item_id uuid references infra_inspection_items(id) on delete cascade,
    location_id uuid,
    title text,
    description text,
    risk_score int,
    status backlog_status default 'open',
    due_date date,
    closed_at timestamptz,
    created_at timestamptz default now()
);

create index idx_backlog_status on infra_backlogs(status);
create index idx_backlog_due on infra_backlogs(due_date);
create index idx_backlog_location on infra_backlogs(location_id);
create index idx_backlog_item on infra_backlogs(item_id);
create index idx_inspection_status on infra_inspections(status);
create index idx_item_risk on infra_inspection_items(risk_score);

-- =========================================
-- FOTO CLOSING BACKLOG
-- =========================================
create table infra_backlog_photos (
    id uuid primary key default uuid_generate_v4(),
    backlog_id uuid references infra_backlogs(id) on delete cascade,
    photo_url text,
    created_at timestamptz default now()
);

create index idx_backlog_photo on infra_backlog_photos(backlog_id);

-- =========================================
-- RLS
-- =========================================
alter table infra_locations enable row level security;
alter table infra_schedules enable row level security;
alter table infra_inspections enable row level security;
alter table infra_inspection_items enable row level security;
alter table infra_item_photos enable row level security;
alter table infra_backlogs enable row level security;
alter table infra_backlog_photos enable row level security;

create policy "auth all locations"
on infra_locations for all
using (auth.role() = 'authenticated');

create policy "auth all inspections"
on infra_inspections for all
using (auth.role() = 'authenticated');

create policy "auth all items"
on infra_inspection_items for all
using (auth.role() = 'authenticated');

create policy "auth all photos"
on infra_item_photos for all
using (auth.role() = 'authenticated');

create policy "auth all backlogs"
on infra_backlogs for all
using (auth.role() = 'authenticated');

alter table infra_locations_items_category enable row level security;
alter table infra_locations_items enable row level security;

create policy "auth all categories"
on infra_locations_items_category for all
using (auth.role() = 'authenticated');

create policy "auth all loc items"
on infra_locations_items for all
using (auth.role() = 'authenticated');

-- =========================================
-- FUNCTION: AUTO CREATE BACKLOG
-- =========================================
create or replace function fn_create_backlog()
returns trigger
language plpgsql
as $$
begin
    if new.is_ok = false then
        insert into infra_backlogs(
            item_id,
            location_id,
            title,
            description,
            risk_score,
            due_date
        )
        select
            new.id,
            i.location_id,
            new.description,
            new.description,
            new.risk_score,
            current_date + interval '7 day'
        from infra_inspections i
        where i.id = new.inspection_id;
    end if;

    return new;
end;
$$;


-- =========================================
-- FUNCTION: AUTO CREATE BACKLOG
-- =========================================

create or replace function fn_mark_overdue()
returns void
language plpgsql
as $$
begin
    update infra_backlogs
    set status = 'progress'
    where due_date < current_date
    and status = 'open';
end;
$$;


-- =========================================
-- TRIGGER
-- =========================================
create trigger trg_auto_backlog
after insert on infra_inspection_items
for each row
execute function fn_create_backlog();

-- =========================================
-- VIEW DASHBOARD
-- =========================================
create or replace view v_infra_backlog as
select
    location_id,
    count(*) filter (where status='open') as open_count,
    count(*) filter (where status='progress') as progress_count,
    count(*) filter (where status='closed') as closed_count,
    count(*) filter (where due_date < current_date and status!='closed') as overdue_count
from infra_backlogs
group by location_id;

-- =========================================
-- RPC CLOSE BACKLOG (WAJIB FOTO)
-- =========================================
create or replace function rpc_close_backlog(
    p_backlog uuid,
    p_photo text
)
returns void
language plpgsql
as $$
begin
    insert into infra_backlog_photos(backlog_id, photo_url)
    values (p_backlog, p_photo);

    update infra_backlogs
    set status='closed',
        closed_at=now()
    where id=p_backlog;
end;
$$;

-- =========================================
-- VIEW
-- =========================================
create or replace view v_infra_dashboard as
select
    l.id as location_id,
    l.name as location_name,

    count(b.id) filter (where b.status='open') as backlog_open,
    count(b.id) filter (where b.status='progress') as backlog_progress,
    count(b.id) filter (where b.status='closed') as backlog_closed,

    count(b.id) filter (
        where b.due_date < current_date
        and b.status != 'closed'
    ) as backlog_overdue

from infra_locations l
left join infra_backlogs b on b.location_id = l.id
group by l.id;

