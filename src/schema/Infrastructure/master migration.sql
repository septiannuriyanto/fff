-- Locations
CREATE TABLE IF NOT EXISTS infra_locations (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL,
  area text,
  banner_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT infra_locations_pkey PRIMARY KEY (id)
);

-- Locations Items Category
CREATE TABLE IF NOT EXISTS infra_locations_items_category (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL,
  CONSTRAINT infra_locations_items_category_pkey PRIMARY KEY (id)
);

-- Locations Items
CREATE TABLE IF NOT EXISTS infra_locations_items (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  infra_locations_id uuid NOT NULL,
  infra_category_id uuid,
  name text,
  description text,
  example_photo text,
  risk_score smallint,
  CONSTRAINT infra_locations_items_pkey PRIMARY KEY (id),
  CONSTRAINT infra_locations_items_infra_category_id_fkey FOREIGN KEY (infra_category_id)
    REFERENCES infra_locations_items_category(id),
  CONSTRAINT infra_locations_items_infra_locations_id_fkey FOREIGN KEY (infra_locations_id)
    REFERENCES infra_locations(id)
);


-- Population
CREATE TABLE IF NOT EXISTS infra_population (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  infra_locations_id uuid NOT NULL,
  population_name text,
  active boolean DEFAULT true,
  queue_num smallint,
  CONSTRAINT infra_population_pkey PRIMARY KEY (id),
  CONSTRAINT infra_population_location_fkey FOREIGN KEY (infra_locations_id) REFERENCES infra_locations(id)
);

-- Schedule
CREATE TABLE IF NOT EXISTS infra_schedules (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  location_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  period integer CHECK (period >= 1 AND period <= 10),
  status text DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT infra_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT infra_schedules_location_id_fkey FOREIGN KEY (location_id) REFERENCES infra_locations(id)
);


-- Inspections
CREATE TABLE IF NOT EXISTS infra_inspections (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  schedule_id uuid NOT NULL,
  location_id uuid NOT NULL,
  inspector_id text NOT NULL,
  inspection_date date NOT NULL,
  status inspection_status DEFAULT 'draft',
  infra_population_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT infra_inspections_pkey PRIMARY KEY (id),
  CONSTRAINT infra_inspections_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES manpower(nrp),
  CONSTRAINT infra_inspections_location_id_fkey FOREIGN KEY (location_id) REFERENCES infra_locations(id),
  CONSTRAINT infra_inspections_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES infra_schedules(id),
  CONSTRAINT infra_inspections_population_id_fkey FOREIGN KEY (infra_population_id) REFERENCES infra_population(id)
);

-- Inspection Items
CREATE TABLE IF NOT EXISTS infra_inspection_items (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  inspection_id uuid NOT NULL,
  master_item_id uuid,
  description text,
  is_ok boolean,
  risk_score integer,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  infra_location_item_id uuid,
  CONSTRAINT infra_inspection_items_pkey PRIMARY KEY (id),
  CONSTRAINT infra_inspection_items_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES infra_inspections(id),
  CONSTRAINT infra_inspection_items_master_item_id_fkey FOREIGN KEY (master_item_id) REFERENCES infra_locations_items(id)
);

-- Item Photos
CREATE TABLE IF NOT EXISTS infra_item_photos (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  item_id uuid NOT NULL,
  photo_url text NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT infra_item_photos_pkey PRIMARY KEY (id),
  CONSTRAINT infra_item_photos_item_id_fkey FOREIGN KEY (item_id) REFERENCES infra_inspection_items(id) ON DELETE CASCADE,
  CONSTRAINT infra_item_photos_item_id_key UNIQUE (item_id)
);


CREATE TABLE IF NOT EXISTS infra_backlogs (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  item_id uuid,
  location_id uuid,
  title text,
  description text,
  risk_score integer,
  status backlog_status DEFAULT 'open',
  due_date date,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  infra_population_id uuid,
  CONSTRAINT infra_backlogs_pkey PRIMARY KEY (id),
  CONSTRAINT infra_backlogs_item_id_fkey FOREIGN KEY (item_id) REFERENCES infra_inspection_items(id) ON DELETE CASCADE,
  CONSTRAINT infra_backlogs_location_id_fkey FOREIGN KEY (location_id) REFERENCES infra_locations(id),
  CONSTRAINT infra_backlogs_population_id_fkey FOREIGN KEY (infra_population_id) REFERENCES infra_population(id)
);

CREATE TABLE IF NOT EXISTS infra_backlog_photos (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  backlog_id uuid,
  photo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT infra_backlog_photos_pkey PRIMARY KEY (id),
  CONSTRAINT infra_backlog_photos_backlog_id_fkey FOREIGN KEY (backlog_id) REFERENCES infra_backlogs(id) ON DELETE CASCADE
);


CREATE OR REPLACE FUNCTION fn_create_backlog()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_ok = false AND NEW.id IS NOT NULL THEN
    INSERT INTO infra_backlogs(item_id, location_id, title, status, created_at)
    VALUES (NEW.id, NEW.infra_location_item_id, 'Auto backlog', 'open', NOW())
    RETURNING id INTO NEW.backlog_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_backlog ON infra_inspection_items;
CREATE TRIGGER trg_auto_backlog
AFTER INSERT ON infra_inspection_items
FOR EACH ROW
EXECUTE FUNCTION fn_create_backlog();


CREATE OR REPLACE VIEW v_infra_backlog AS
SELECT
  location_id,
  COUNT(*) FILTER (WHERE status='open') AS open_count,
  COUNT(*) FILTER (WHERE status='progress') AS progress_count,
  COUNT(*) FILTER (WHERE status='closed') AS closed_count,
  COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status<>'closed') AS overdue_count
FROM infra_backlogs
GROUP BY location_id;

CREATE OR REPLACE VIEW v_infra_dashboard AS
SELECT
  l.id AS location_id,
  l.name AS location_name,
  COUNT(b.id) FILTER (WHERE b.status='open') AS backlog_open,
  COUNT(b.id) FILTER (WHERE b.status='progress') AS backlog_progress,
  COUNT(b.id) FILTER (WHERE b.status='closed') AS backlog_closed,
  COUNT(b.id) FILTER (WHERE b.due_date<CURRENT_DATE AND b.status<>'closed') AS backlog_overdue
FROM infra_locations l
LEFT JOIN infra_backlogs b ON b.location_id = l.id
GROUP BY l.id;


CREATE INDEX IF NOT EXISTS idx_backlog_status ON infra_backlogs(status);
CREATE INDEX IF NOT EXISTS idx_backlog_due ON infra_backlogs(due_date);
CREATE INDEX IF NOT EXISTS idx_backlog_location ON infra_backlogs(location_id);
CREATE INDEX IF NOT EXISTS idx_item_inspection ON infra_inspection_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_item_risk ON infra_inspection_items(risk_score);
CREATE INDEX IF NOT EXISTS idx_schedule_location ON infra_schedules(location_id);
CREATE INDEX IF NOT EXISTS idx_schedule_period ON infra_schedules(period);
CREATE INDEX IF NOT EXISTS idx_inspection_location ON infra_inspections(location_id);
CREATE INDEX IF NOT EXISTS idx_inspection_schedule ON infra_inspections(schedule_id);
CREATE INDEX IF NOT EXISTS idx_inspection_status ON infra_inspections(status);
