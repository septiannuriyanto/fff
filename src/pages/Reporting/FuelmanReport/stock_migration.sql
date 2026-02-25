-- Create new table for Fuelman Report Stock
CREATE TABLE IF NOT EXISTS public.fuelman_report_stock (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.fuelman_reports(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    sonding_awal NUMERIC NOT NULL,
    sonding_akhir NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.fuelman_report_stock ENABLE ROW LEVEL SECURITY;

-- Add policies
DROP POLICY IF EXISTS "Public access for fuelman_report_stock" ON public.fuelman_report_stock;
CREATE POLICY "Public access for fuelman_report_stock" ON public.fuelman_report_stock
    FOR ALL USING (true) WITH CHECK (true);

-- Update the RPC function
CREATE OR REPLACE FUNCTION public.create_fuelman_report(
  p_report_date date,
  p_report_shift int,
  p_fuelman_id uuid,
  p_operator_id uuid,
  p_ft_number text,
  p_ritasi jsonb,
  p_transfers jsonb,
  p_flowmeter jsonb,
  p_tmr jsonb,
  p_stock jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report_id uuid;
  v_organization_id uuid;
BEGIN
  -- Fetch organization_id from manpower
  SELECT organization_id INTO v_organization_id 
  FROM public.manpower 
  WHERE user_id = p_fuelman_id
  LIMIT 1;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Organization ID not found for fuelman %', p_fuelman_id;
  END IF;

  -- 1. Insert Master Report
  INSERT INTO public.fuelman_reports (
    organization_id,
    report_date,
    shift,
    fuelman_id,
    operator_id,
    ft_number,
    created_by
  )
  VALUES (
    v_organization_id,
    p_report_date,
    p_report_shift,
    p_fuelman_id,
    p_operator_id,
    p_ft_number,
    auth.uid()
  )
  RETURNING id INTO v_report_id;

  -- 2. Insert Ritasi
  IF p_ritasi IS NOT NULL AND jsonb_array_length(p_ritasi) > 0 THEN
    INSERT INTO public.fuelman_report_ritasi (
      report_id,
      ft_number,
      value
    )
    SELECT
      v_report_id,
      (x->>'ft_number'),
      (x->>'value')::numeric
    FROM jsonb_array_elements(p_ritasi) AS x;
  END IF;

  -- 3. Insert Transfers
  IF p_transfers IS NOT NULL AND jsonb_array_length(p_transfers) > 0 THEN
    INSERT INTO public.fuelman_report_transfers (
      report_id,
      transfer_from,
      transfer_out,
      destination,
      synchronized
    )
    SELECT
      v_report_id,
      (x->>'transfer_from'),
      (x->>'transfer_out')::numeric,
      (x->>'destination'),
      (x->>'synchronized')::boolean
    FROM jsonb_array_elements(p_transfers) AS x;
  END IF;

  -- 4. Insert Flowmeter
  IF p_flowmeter IS NOT NULL AND jsonb_array_length(p_flowmeter) > 0 THEN
    INSERT INTO public.fuelman_report_flowmeter (
      report_id,
      unit_number,
      fm_awal,
      fm_akhir,
      usage
    )
    SELECT
      v_report_id,
      (x->>'unit_number'),
      (x->>'fm_awal')::numeric,
      (x->>'fm_akhir')::numeric,
      (x->>'usage')::numeric
    FROM jsonb_array_elements(p_flowmeter) AS x;
  END IF;

  -- 5. Insert Stock
  IF p_stock IS NOT NULL AND jsonb_array_length(p_stock) > 0 THEN
    INSERT INTO public.fuelman_report_stock (
      report_id,
      unit_number,
      sonding_awal,
      sonding_akhir
    )
    SELECT
      v_report_id,
      (x->>'unit_number'),
      REPLACE(x->>'sonding_awal', ',', '.')::numeric,
      REPLACE(x->>'sonding_akhir', ',', '.')::numeric
    FROM jsonb_array_elements(p_stock) AS x;
  END IF;

  -- 6. Insert TMR
  IF p_tmr IS NOT NULL AND jsonb_array_length(p_tmr) > 0 THEN
    INSERT INTO public.fuelman_report_tmr (
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
    SELECT
      v_report_id,
      (x->>'loader_id'),
      (x->>'time_refueling'),
      NULLIF(x->>'reason', ''),
      NULLIF(x->>'evidence_url', ''),
      (NULLIF(x->>'area_id', '')::UUID),
      NULLIF(x->>'location_detail', ''),
      (x->>'inside_rest_time')::boolean,
      (x->>'is_slippery')::boolean
    FROM jsonb_array_elements(p_tmr) AS x;
  END IF;

  RETURN v_report_id;
END;
$$;
