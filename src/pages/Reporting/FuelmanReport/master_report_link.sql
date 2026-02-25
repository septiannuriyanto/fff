-- Add master_report_id to fuelman_reports
ALTER TABLE public.fuelman_reports ADD COLUMN IF NOT EXISTS master_report_id uuid REFERENCES public.fuelman_master_report(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_fuelman_reports_master_id ON public.fuelman_reports(master_report_id);
