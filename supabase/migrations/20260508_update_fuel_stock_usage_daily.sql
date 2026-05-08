-- Update get_fuel_stock_management_monthly to aggregate usage by date across all shifts
CREATE OR REPLACE FUNCTION public.get_fuel_stock_management_monthly(
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stock jsonb;
  v_usage jsonb;
  v_ritasi jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  INTO v_stock
  FROM (
    SELECT
      fr.report_date AS date,
      fs.unit_number,
      coalesce(st.warehouse_id, fs.unit_number) AS warehouse_id,
      SUM(coalesce(fs.qty_awal, 0)) AS qty_awal,
      SUM(coalesce(fs.qty_akhir, 0)) AS qty_akhir
    FROM public.fuelman_reports fr
    JOIN public.fuelman_report_stock fs
      ON fs.report_id = fr.id
    LEFT JOIN public.storage st
      ON st.unit_id = fs.unit_number
    WHERE fr.report_date BETWEEN p_start_date AND p_end_date
      AND fr.shift = 1
    GROUP BY fr.report_date, fs.unit_number, st.warehouse_id
    ORDER BY fr.report_date, coalesce(st.warehouse_id, fs.unit_number)
  ) t;

  SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  INTO v_usage
  FROM (
    SELECT
      lv.issued_date AS date,
      lv.warehouse_code,
      SUM(coalesce(lv.qty, 0)) AS qty
    FROM public.loto_verification lv
    WHERE lv.issued_date BETWEEN p_start_date AND p_end_date
      AND coalesce(lv.is_included, true) = true
    GROUP BY lv.issued_date, lv.warehouse_code
    ORDER BY lv.issued_date, lv.warehouse_code
  ) t;

  SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  INTO v_ritasi
  FROM (
    SELECT
      rf.ritation_date AS date,
      rf.warehouse_id,
      SUM(coalesce(rf.qty_sj, 0)) AS value
    FROM public.ritasi_fuel rf
    WHERE rf.ritation_date BETWEEN p_start_date AND p_end_date
    GROUP BY rf.ritation_date, rf.warehouse_id
    ORDER BY rf.ritation_date, rf.warehouse_id
  ) t;

  RETURN jsonb_build_object(
    'stock', v_stock,
    'usage', v_usage,
    'ritasi', v_ritasi
  );
END;
$$;
