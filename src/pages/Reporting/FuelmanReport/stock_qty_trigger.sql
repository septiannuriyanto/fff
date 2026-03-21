-- Function to calculate liters from sonding height (cm) using tera_tangki interpolation
CREATE OR REPLACE FUNCTION public.get_qty_from_tera(p_unit_id text, p_height_cm numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_mm numeric;
    v_exact_qty numeric;
    v_t1 record;
    v_t2 record;
BEGIN
    -- Return 0 if input is null or non-positive
    IF p_unit_id IS NULL OR p_height_cm IS NULL OR p_height_cm <= 0 THEN
        RETURN 0;
    END IF;

    -- Convert cm to mm (since tera_tangki uses height_mm)
    v_target_mm := p_height_cm * 10;

    -- 1. Check if exact match exists in tera_tangki
    SELECT qty_liter INTO v_exact_qty
    FROM public.tera_tangki
    WHERE unit_id = p_unit_id AND height_mm = v_target_mm;

    IF FOUND THEN
        RETURN v_exact_qty;
    END IF;

    -- 2. Find closest lower point
    SELECT height_mm, qty_liter INTO v_t1
    FROM public.tera_tangki
    WHERE unit_id = p_unit_id AND height_mm < v_target_mm
    ORDER BY height_mm DESC
    LIMIT 1;

    -- 3. Find closest higher point
    SELECT height_mm, qty_liter INTO v_t2
    FROM public.tera_tangki
    WHERE unit_id = p_unit_id AND height_mm > v_target_mm
    ORDER BY height_mm ASC
    LIMIT 1;

    -- 4. Interpolate if both bounds are found
    IF v_t1.height_mm IS NOT NULL AND v_t2.height_mm IS NOT NULL THEN
        RETURN ROUND(
            (v_t1.qty_liter + 
            ((v_target_mm - v_t1.height_mm) * (v_t2.qty_liter - v_t1.qty_liter)) / 
            (v_t2.height_mm - v_t1.height_mm))::numeric, 
            2
        );
    -- 5. Handle edge cases where target goes out of boundaries
    ELSIF v_t1.height_mm IS NULL AND v_t2.height_mm IS NOT NULL THEN
        -- Below the lowest known tera point, assume linear from 0
        IF v_t2.height_mm > 0 THEN
            RETURN ROUND(((v_target_mm * v_t2.qty_liter) / v_t2.height_mm)::numeric, 2);
        ELSE
            RETURN 0;
        END IF;
    ELSIF v_t1.height_mm IS NOT NULL AND v_t2.height_mm IS NULL THEN
        -- Above the highest known tera point, return max known volume
        RETURN v_t1.qty_liter;
    END IF;

    -- Fail-safe
    RETURN 0;
END;
$$;


-- Migration: Add the columns to fuelman_report_stock if they don't exist yet
ALTER TABLE public.fuelman_report_stock 
ADD COLUMN IF NOT EXISTS qty_awal real NULL,
ADD COLUMN IF NOT EXISTS qty_akhir real NULL;


-- Trigger Function to calculate sonding quantities automatically
CREATE OR REPLACE FUNCTION public.trg_calculate_stock_qty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Mengisi qty_awal dan qty_akhir dengan RPC get_qty_from_tera
    NEW.qty_awal := public.get_qty_from_tera(NEW.unit_number, NEW.sonding_awal);
    NEW.qty_akhir := public.get_qty_from_tera(NEW.unit_number, NEW.sonding_akhir);
    
    RETURN NEW;
END;
$$;


-- Attach Trigger (Drop first if exists to avoid conflicts)
DROP TRIGGER IF EXISTS trg_stock_calculate_qty ON public.fuelman_report_stock;

CREATE TRIGGER trg_stock_calculate_qty
BEFORE INSERT OR UPDATE OF sonding_awal, sonding_akhir, unit_number
ON public.fuelman_report_stock
FOR EACH ROW
EXECUTE FUNCTION public.trg_calculate_stock_qty();


-- Optional Backfill for Existing Data
-- Jalankan query ini SEKALI SAJA di SQL Editor untuk membackfill data qty pada row yang sudah ada
-- UPDATE public.fuelman_report_stock
-- SET 
--     qty_awal = public.get_qty_from_tera(unit_number, sonding_awal),
--     qty_akhir = public.get_qty_from_tera(unit_number, sonding_akhir)
-- WHERE qty_awal IS NULL OR qty_akhir IS NULL;
