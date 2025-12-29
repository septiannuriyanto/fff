CREATE OR REPLACE FUNCTION get_verification_summary()
RETURNS TABLE (
  session_code text,
  issued_date date,
  shift smallint,
  warehouse_code text,
  verif_count bigint,
  records_count bigint,
  session_created boolean,
  session_id bigint,
  fuelman text,
  operator text,
  session_created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  WITH verif_agg AS (
    SELECT
      lv.session_code,
      MAX(lv.issued_date) as issued_date,
      MAX(lv.shift) as shift,
      MAX(lv.warehouse_code) as warehouse_code,
      COUNT(*) as verif_count
    FROM
      loto_verification lv
    GROUP BY
      lv.session_code
  ),
  records_agg AS (
      SELECT
          lr.session_id,
          COUNT(*) as records_count
      FROM
          loto_records lr
      GROUP BY
          lr.session_id
  )
  SELECT
    va.session_code,
    va.issued_date,
    va.shift,
    COALESCE(ls.warehouse_code, va.warehouse_code) as warehouse_code,
    va.verif_count,
    COALESCE(ra.records_count, 0) as records_count,
    (ls.id IS NOT NULL) as session_created,
    ls.id as session_id,
    ls.fuelman,
    ls.operator,
    ls.created_at as session_created_at
  FROM
    verif_agg va
  LEFT JOIN
    loto_sessions ls ON va.session_code = ls.session_code
  LEFT JOIN
    records_agg ra ON va.session_code = ra.session_id
  ORDER BY
    va.session_code DESC;
END;
$$ LANGUAGE plpgsql;
