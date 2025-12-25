-- RPC for Daily Warehouse Achievement
-- Returns achievement per warehouse for a specific date
CREATE OR REPLACE FUNCTION get_loto_warehouse_daily_achievement(target_date date)
RETURNS TABLE (
  warehouse_code text,
  total_loto bigint,
  total_verification bigint,
  percentage numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH loto_counts AS (
    SELECT
      ls.warehouse_code as w,
      count(lr.id) as cnt
    FROM loto_sessions ls
    JOIN loto_records lr ON lr.session_id = ls.session_code
    -- Extract date from session_code (YYMMDD...)
    WHERE to_date(substring(ls.session_code from 1 for 6), 'YYMMDD') = target_date
    GROUP BY 1
  ),
  verification_counts AS (
    SELECT
      lv.warehouse_code as w,
      count(*) as cnt
    FROM loto_verification lv
    WHERE issued_date = target_date
    GROUP BY 1
  )
  SELECT
    COALESCE(lc.w, vc.w, 'Unknown') as warehouse_code,
    COALESCE(lc.cnt, 0) as total_loto,
    COALESCE(vc.cnt, 0) as total_verification,
    CASE WHEN COALESCE(vc.cnt, 0) > 0 THEN
      ROUND((COALESCE(lc.cnt, 0)::numeric / vc.cnt) * 100, 2)
    ELSE
      0
    END as percentage
  FROM loto_counts lc
  FULL OUTER JOIN verification_counts vc ON lc.w = vc.w
  ORDER BY 4 DESC, 1;
END;
$$;

-- RPC for Warehouse History (Mini Chart)
-- Returns daily history for a specific warehouse
CREATE OR REPLACE FUNCTION get_loto_warehouse_history(target_warehouse text, days_back int DEFAULT 30)
RETURNS TABLE (
  date date,
  total_loto bigint,
  total_verification bigint,
  percentage numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH cutoff_date AS (
    SELECT (COALESCE(MAX(issued_date), (now() AT TIME ZONE 'Asia/Makassar')::date) + 1)::date as d
    FROM loto_verification
  ),
  loto_counts AS (
    SELECT
      to_date(substring(ls.session_code from 1 for 6), 'YYMMDD') as d,
      count(lr.id) as cnt
    FROM loto_sessions ls
    JOIN cutoff_date cd ON true
    JOIN loto_records lr ON lr.session_id = ls.session_code
    WHERE ls.warehouse_code = target_warehouse
      AND to_date(substring(ls.session_code from 1 for 6), 'YYMMDD') >= (cd.d - days_back)
      AND to_date(substring(ls.session_code from 1 for 6), 'YYMMDD') < cd.d
    GROUP BY 1
  ),
  verification_counts AS (
    SELECT
      lv.issued_date as d,
      count(*) as cnt
    FROM loto_verification lv
    JOIN cutoff_date cd ON true
    WHERE lv.warehouse_code = target_warehouse
      AND lv.issued_date >= (cd.d - days_back)
      AND lv.issued_date < cd.d
    GROUP BY 1
  )
  SELECT
    COALESCE(lc.d, vc.d) as date,
    COALESCE(lc.cnt, 0) as total_loto,
    COALESCE(vc.cnt, 0) as total_verification,
    CASE WHEN COALESCE(vc.cnt, 0) > 0 THEN
      ROUND((COALESCE(lc.cnt, 0)::numeric / vc.cnt) * 100, 2)
    ELSE
      0
    END as percentage
  FROM loto_counts lc
  FULL OUTER JOIN verification_counts vc ON lc.d = vc.d
  ORDER BY 1 ASC;
END;
$$;
