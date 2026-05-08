-- Create daily_coordination table for tracking meeting parameters as unstructured JSONB
CREATE TABLE IF NOT EXISTS public.daily_coordination (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  date date NULL DEFAULT CURRENT_DATE,
  created_at timestamp WITH time zone NOT NULL DEFAULT now(),
  parameters jsonb NULL DEFAULT '{}'::jsonb,
  CONSTRAINT daily_coordination_pkey PRIMARY KEY (id),
  CONSTRAINT daily_coordination_date_unique UNIQUE (date)
);

-- Enable RLS
ALTER TABLE public.daily_coordination ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all authenticated users" ON public.daily_coordination
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for all authenticated users" ON public.daily_coordination
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for all authenticated users" ON public.daily_coordination
  FOR UPDATE TO authenticated USING (true);

-- Grant access
GRANT ALL ON public.daily_coordination TO authenticated;
GRANT ALL ON public.daily_coordination TO service_role;
