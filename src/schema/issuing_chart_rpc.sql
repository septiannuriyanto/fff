-- RPC 1: get_issuing_daily_trend
-- Untuk chart Issuing by date (Total vs By Phase)
CREATE OR REPLACE FUNCTION public.get_issuing_daily_trend(p_start_date date, p_end_date date)
RETURNS TABLE (
    issued_date date,
    total_qty numeric,
    phase_1_qty numeric,
    phase_2_qty numeric,
    phase_3_qty numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lv.issued_date,
        SUM(lv.qty) AS total_qty,
        SUM(CASE WHEN lv.refueling_phase = 1 THEN lv.qty ELSE 0 END) AS phase_1_qty,
        SUM(CASE WHEN lv.refueling_phase = 2 THEN lv.qty ELSE 0 END) AS phase_2_qty,
        SUM(CASE WHEN lv.refueling_phase = 3 THEN lv.qty ELSE 0 END) AS phase_3_qty
    FROM public.loto_verification lv
    WHERE lv.issued_date >= p_start_date AND lv.issued_date <= p_end_date
    GROUP BY lv.issued_date
    ORDER BY lv.issued_date ASC;
END;
$$;

-- RPC 2: get_average_daily_usage_by_unit_phase
-- Untuk chart Average usage by unit (dihitung rata-rata harian)
CREATE OR REPLACE FUNCTION public.get_average_daily_usage_by_unit_phase(p_start_date date, p_end_date date)
RETURNS TABLE (
    unit_id text,
    phase_all numeric,
    phase_1 numeric,
    phase_2 numeric,
    phase_3 numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sub.unit_id,
        ROUND(AVG(sub.total_all), 2) AS phase_all,
        ROUND(AVG(NULLIF(sub.total_1, 0)), 2) AS phase_1,
        ROUND(AVG(NULLIF(sub.total_2, 0)), 2) AS phase_2,
        ROUND(AVG(NULLIF(sub.total_3, 0)), 2) AS phase_3
    FROM (
        SELECT 
            s.unit_id,
            s.warehouse_id,
            lv.issued_date,
            SUM(lv.qty) AS total_all,
            SUM(CASE WHEN lv.refueling_phase = 1 THEN lv.qty ELSE 0 END) AS total_1,
            SUM(CASE WHEN lv.refueling_phase = 2 THEN lv.qty ELSE 0 END) AS total_2,
            SUM(CASE WHEN lv.refueling_phase = 3 THEN lv.qty ELSE 0 END) AS total_3
        FROM public.loto_verification lv
        JOIN public.storage s ON lv.warehouse_code = s.warehouse_id
        WHERE lv.issued_date >= p_start_date AND lv.issued_date <= p_end_date
          AND s.unit_id IS NOT NULL
        GROUP BY s.unit_id, s.warehouse_id, lv.issued_date
    ) sub
    GROUP BY sub.unit_id, sub.warehouse_id
    ORDER BY sub.warehouse_id ASC;
END;
$$;
