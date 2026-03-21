-- RPC: get_last_3_days_average_usage
-- Menghitung rata-rata penggunaan (total_refueling) harian suatu unit FT
-- berdasarkan 3 hari operasional terakhir (yang paling baru dilaporkan),
-- difilter berdasarkan refueling_phase = 1 DAN shift tertentu (shift berikutnya).
--
-- Logika shift:
--   Laporan Shift 1 → stok akan dipakai Shift 2 → p_next_shift = 2
--   Laporan Shift 2 → stok akan dipakai Shift 1 hari berikutnya → p_next_shift = 1
--
-- Contoh pemanggilan:
--   SELECT get_last_3_days_average_usage('FT190', 2);  -- untuk laporan Shift 1

CREATE OR REPLACE FUNCTION public.get_last_3_days_average_usage(
    p_unit_id   text,
    p_next_shift smallint DEFAULT 1  -- shift berikutnya yang akan memakai stok ini
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_avg_usage numeric;
BEGIN
    SELECT COALESCE(ROUND(AVG(daily_usage), 2), 0) INTO v_avg_usage
    FROM (
        -- Rata-rata total qty per tanggal, hanya Phase 1 dari shift yang ditentukan
        SELECT lv.issued_date, SUM(lv.qty) AS daily_usage
        FROM public.loto_verification lv
        JOIN public.storage s ON lv.warehouse_code = s.warehouse_id
        WHERE s.unit_id        = p_unit_id
          AND lv.refueling_phase = 1
          AND lv.shift           = p_next_shift
          AND lv.issued_date     IS NOT NULL
        GROUP BY lv.issued_date
        ORDER BY lv.issued_date DESC
        LIMIT 3
    ) subquery;

    RETURN v_avg_usage;
END;
$$;
