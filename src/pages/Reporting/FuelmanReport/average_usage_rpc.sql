-- RPC: get_last_3_days_average_usage
-- Menghitung rata-rata penggunaan (total_refueling) harian suatu unit FT 
-- berdasarkan 3 hari operasional terakhir (yang paling baru dilaporkan).

CREATE OR REPLACE FUNCTION public.get_last_3_days_average_usage(p_unit_id text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_avg_usage numeric;
BEGIN
    SELECT COALESCE(ROUND(AVG(daily_usage), 2), 0) INTO v_avg_usage
    FROM (
        -- Mengambil total qty per tanggal berdasarkan data LOTO di mana unit_id-nya cocok
        -- HANYA untuk "refueling_phase = 1" (sebelum 11:45)
        SELECT lv.issued_date, SUM(lv.qty) AS daily_usage
        FROM public.loto_verification lv
        JOIN public.storage s ON lv.warehouse_code = s.warehouse_id
        WHERE s.unit_id = p_unit_id
          AND lv.refueling_phase = 1
          AND lv.issued_date IS NOT NULL
        GROUP BY lv.issued_date
        ORDER BY lv.issued_date DESC
        LIMIT 3
    ) subquery;

    RETURN v_avg_usage;
END;
$$;
