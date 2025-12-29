CREATE OR REPLACE FUNCTION get_loto_session_summary()
RETURNS TABLE (
  id bigint,
  created_at timestamp with time zone,
  create_shift smallint,
  fuelman text,
  operator text,
  warehouse_code text,
  session_code text,
  records_count bigint,
  verif_count bigint
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.id,
    ls.created_at,
    ls.create_shift,
    ls.fuelman,
    ls.operator,
    ls.warehouse_code,
    ls.session_code,
    (SELECT COUNT(*)::bigint FROM loto_records lr WHERE lr.session_id = ls.session_code) AS records_count,
    (SELECT COUNT(*)::bigint FROM loto_verification lv WHERE lv.session_code = ls.session_code) AS verif_count
  FROM loto_sessions ls
  ORDER BY ls.session_code DESC;
END;
$$;
