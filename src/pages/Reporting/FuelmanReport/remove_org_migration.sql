-- Remove organization_id from fuelman_reports
ALTER TABLE public.fuelman_reports DROP COLUMN IF EXISTS organization_id;

-- Drop index if it exists
DROP INDEX IF EXISTS idx_fuelman_reports_org;
