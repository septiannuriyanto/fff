-- Function to upsert LOTO verification records with "relocation" logic for duplicates
CREATE OR REPLACE FUNCTION public.upsert_loto_verification_v2(
  p_records jsonb,
  p_mode text -- 'unique' or 'upsert'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record jsonb;
  v_id uuid;
  v_count_inserted int := 0;
  v_count_skipped int := 0;
  v_count_relocated int := 0;
  v_temp_id uuid;
BEGIN
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    -- Try to parse id as uuid. If it's not a uuid, we might have an issue
    -- unless the user is providing valid uuids from Excel.
    v_id := (v_record->>'id')::uuid;
    
    -- Check if ID exists
    IF EXISTS (SELECT 1 FROM public.loto_verification WHERE id = v_id) THEN
      IF p_mode = 'unique' THEN
        v_count_skipped := v_count_skipped + 1;
        CONTINUE; -- Skip this record
      ELSIF p_mode = 'upsert' THEN
        -- Relocate existing record: Rename its ID to a new random UUID
        v_temp_id := gen_random_uuid();
        UPDATE public.loto_verification
        SET id = v_temp_id
        WHERE id = v_id;
        
        v_count_relocated := v_count_relocated + 1;
      END IF;
    END IF;

    -- Insert new record
    INSERT INTO public.loto_verification (
      id, no_logsheet, issued_date, shift, warehouse_code, 
      cn_unit, "EGI", equip_class, hm, qty, 
      refueling_start, refueling_end, is_included, session_code
    ) VALUES (
      v_id,
      v_record->>'no_logsheet',
      (v_record->>'issued_date')::date,
      (v_record->>'shift')::smallint,
      v_record->>'warehouse_code',
      v_record->>'cn_unit',
      v_record->>'EGI',
      v_record->>'equip_class',
      (v_record->>'hm')::bigint,
      (v_record->>'qty')::numeric,
      (v_record->>'refueling_start')::timestamptz,
      (v_record->>'refueling_end')::timestamptz,
      (v_record->>'is_included')::boolean,
      v_record->>'session_code'
    );
    
    v_count_inserted := v_count_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_count_inserted,
    'skipped', v_count_skipped,
    'relocated', v_count_relocated
  );
END;
$$;

-- Optimized function to fetch ONLY the totals once
CREATE OR REPLACE FUNCTION public.get_fuel_usage_report_totals(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_shift smallint DEFAULT NULL,
  p_warehouse_code text DEFAULT NULL,
  p_cn_unit text DEFAULT NULL,
  p_egi text DEFAULT NULL,
  p_is_included boolean DEFAULT NULL
)
RETURNS TABLE (
  total_count bigint,
  grand_total_qty numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    count(*)::bigint, 
    coalesce(sum(qty), 0)::numeric
  FROM public.loto_verification lv
  WHERE 
    (p_start_date IS NULL OR lv.issued_date >= p_start_date) AND
    (p_end_date IS NULL OR lv.issued_date <= p_end_date) AND
    (p_shift IS NULL OR lv.shift = p_shift) AND
    (p_warehouse_code IS NULL OR lv.warehouse_code = p_warehouse_code) AND
    (p_cn_unit IS NULL OR lv.cn_unit ILIKE '%' || p_cn_unit || '%') AND
    (p_egi IS NULL OR lv."EGI" = p_egi) AND
    (p_is_included IS NULL OR lv.is_included = p_is_included);
END;
$$;

-- Optimized function to fetch ONLY the records (fast batches)
CREATE OR REPLACE FUNCTION public.get_fuel_usage_report_data(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_shift smallint DEFAULT NULL,
  p_warehouse_code text DEFAULT NULL,
  p_cn_unit text DEFAULT NULL,
  p_egi text DEFAULT NULL,
  p_is_included boolean DEFAULT NULL,
  p_limit int DEFAULT 1000,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  no_logsheet text,
  issued_date date,
  shift smallint,
  warehouse_code text,
  cn_unit text,
  "EGI" text,
  equip_class text,
  hm bigint,
  qty numeric,
  refueling_start timestamptz,
  refueling_end timestamptz,
  is_included boolean,
  session_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lv.id, lv.no_logsheet, lv.issued_date, lv.shift, lv.warehouse_code, 
    lv.cn_unit, lv."EGI", lv.equip_class, lv.hm, lv.qty, 
    lv.refueling_start, lv.refueling_end, lv.is_included, lv.session_code
  FROM public.loto_verification lv
  WHERE 
    (p_start_date IS NULL OR lv.issued_date >= p_start_date) AND
    (p_end_date IS NULL OR lv.issued_date <= p_end_date) AND
    (p_shift IS NULL OR lv.shift = p_shift) AND
    (p_warehouse_code IS NULL OR lv.warehouse_code = p_warehouse_code) AND
    (p_cn_unit IS NULL OR lv.cn_unit ILIKE '%' || p_cn_unit || '%') AND
    (p_egi IS NULL OR lv."EGI" = p_egi) AND
    (p_is_included IS NULL OR lv.is_included = p_is_included)
  ORDER BY lv.issued_date DESC, lv.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
