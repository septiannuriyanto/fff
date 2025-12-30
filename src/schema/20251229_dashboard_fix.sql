-- Migration to update dashboard cutoff logic to depend on the MAX date in loto_verification
-- Replaces logic 'Exclude Today' with 'Include up to MAX(issued_date)'
-- Uses session_code 'YYMMDD' prefix for accurate date grouping
-- Uses session_code MIDDLE part for Shift (Dynamic Length)
-- Handles both 4-digit (0001) and 5-digit (00001) shifts
-- Assumes Warehouse Suffix is always last 4 chars
-- COVERS ALL DASHBOARD METRICS (Total, Detail, History, Trend, Ranking)

drop function if exists get_loto_achievement_warehouse(int);
drop function if exists get_loto_ranking_nrp(int);
drop function if exists get_loto_achievement_trend(int);
drop function if exists get_loto_achievement_warehouse_by_shift(int);
drop function if exists get_loto_warehouse_daily_achievement_by_shift(date);
drop function if exists get_loto_warehouse_daily_achievement(date);
drop function if exists get_loto_warehouse_history(text, int);
drop function if exists get_loto_warehouse_history_by_shift(text, int);


-- 1. Warehouse Achievement (Total - 30 Days)
CREATE OR REPLACE FUNCTION get_loto_achievement_warehouse(days_back int DEFAULT 30)
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
  WITH cutoff_date AS (
    SELECT (COALESCE(MAX(issued_date), (now() AT TIME ZONE 'Asia/Makassar')::date) + 1)::date as d
    FROM loto_verification
  ),
  loto_counts AS (
    SELECT
      ls.warehouse_code as w,
      count(lr.id) as cnt
    FROM loto_sessions ls
    JOIN cutoff_date cd ON true
    JOIN loto_records lr ON lr.session_id = ls.session_code
    WHERE 
      -- Date Regex Check
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END >= (cd.d - days_back)
    AND 
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END < cd.d
    GROUP BY 1
  ),
  verification_counts AS (
    SELECT
      lv.warehouse_code as w,
      count(*) as cnt
    FROM loto_verification lv
    JOIN cutoff_date cd ON true
    WHERE issued_date >= (cd.d - days_back)
      AND issued_date < cd.d
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

-- 2. Warehouse Achievement BY SHIFT (30 Days)
CREATE OR REPLACE FUNCTION get_loto_achievement_warehouse_by_shift(days_back int DEFAULT 30)
RETURNS TABLE (
  warehouse_code text,
  shift smallint,
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
      ls.warehouse_code as w,
      -- DYNAMIC SHIFT PARSING
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN 
            CAST(substring(ls.session_code from 9 for (length(ls.session_code) - 8 - 4)) AS SMALLINT)
        WHEN ls.session_code ~ '^\d{6}' THEN 
            CAST(substring(ls.session_code from 7 for (length(ls.session_code) - 6 - 4)) AS SMALLINT)
        ELSE 0::smallint
      END as s,
      count(lr.id) as cnt
    FROM loto_sessions ls
    JOIN cutoff_date cd ON true
    JOIN loto_records lr ON lr.session_id = ls.session_code
    WHERE 
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END >= (cd.d - days_back)
    AND 
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END < cd.d
    GROUP BY 1, 2
  ),
  verification_counts AS (
    SELECT
      lv.warehouse_code as w,
      lv.shift as s,
      count(*) as cnt
    FROM loto_verification lv
    JOIN cutoff_date cd ON true
    WHERE issued_date >= (cd.d - days_back)
      AND issued_date < cd.d
    GROUP BY 1, 2
  )
  SELECT
    COALESCE(lc.w, vc.w, 'Unknown') as warehouse_code,
    COALESCE(lc.s, vc.s) as shift,
    COALESCE(lc.cnt, 0) as total_loto,
    COALESCE(vc.cnt, 0) as total_verification,
    CASE WHEN COALESCE(vc.cnt, 0) > 0 THEN
      ROUND((COALESCE(lc.cnt, 0)::numeric / vc.cnt) * 100, 2)
    ELSE
      0
    END as percentage
  FROM loto_counts lc
  FULL OUTER JOIN verification_counts vc ON lc.w = vc.w AND lc.s = vc.s
  ORDER BY 1, 2;
END;
$$;

-- 3. Warehouse Daily Achievement BY SHIFT (Specific Date)
CREATE OR REPLACE FUNCTION get_loto_warehouse_daily_achievement_by_shift(target_date date)
RETURNS TABLE (
  warehouse_code text,
  shift smallint,
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
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN 
            CAST(substring(ls.session_code from 9 for (length(ls.session_code) - 8 - 4)) AS SMALLINT)
        WHEN ls.session_code ~ '^\d{6}' THEN 
            CAST(substring(ls.session_code from 7 for (length(ls.session_code) - 6 - 4)) AS SMALLINT)
        ELSE 0::smallint
      END as s,
      count(lr.id) as cnt
    FROM loto_sessions ls
    JOIN loto_records lr ON lr.session_id = ls.session_code
    WHERE 
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END = target_date
    GROUP BY 1, 2
  ),
  verification_counts AS (
    SELECT
      lv.warehouse_code as w,
      lv.shift as s,
      count(*) as cnt
    FROM loto_verification lv
    WHERE lv.issued_date = target_date
    GROUP BY 1, 2
  )
  SELECT
    COALESCE(lc.w, vc.w, 'Unknown') as warehouse_code,
    COALESCE(lc.s, vc.s) as shift,
    COALESCE(lc.cnt, 0) as total_loto,
    COALESCE(vc.cnt, 0) as total_verification,
    CASE WHEN COALESCE(vc.cnt, 0) > 0 THEN
      ROUND((COALESCE(lc.cnt, 0)::numeric / vc.cnt) * 100, 2)
    ELSE
      0
    END as percentage
  FROM loto_counts lc
  FULL OUTER JOIN verification_counts vc ON lc.w = vc.w AND lc.s = vc.s
  ORDER BY 1, 2;
END;
$$;

-- 4. Warehouse Daily Achievement (Total - Specific Date)
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
    WHERE 
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END = target_date
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

-- 5. Warehouse History By Shift (Chart)
CREATE OR REPLACE FUNCTION get_loto_warehouse_history_by_shift(target_warehouse text, days_back int DEFAULT 30)
RETURNS TABLE (
  date date,
  shift smallint,
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
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END as d,
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN 
            CAST(substring(ls.session_code from 9 for (length(ls.session_code) - 8 - 4)) AS SMALLINT)
        WHEN ls.session_code ~ '^\d{6}' THEN 
            CAST(substring(ls.session_code from 7 for (length(ls.session_code) - 6 - 4)) AS SMALLINT)
        ELSE 0::smallint
      END as s,
      count(lr.id) as cnt
    FROM loto_sessions ls
    JOIN cutoff_date cd ON true
    JOIN loto_records lr ON lr.session_id = ls.session_code
    WHERE ls.warehouse_code = target_warehouse
    AND
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END >= (cd.d - days_back)
    AND 
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END < cd.d
    GROUP BY 1, 2
  ),
  verification_counts AS (
    SELECT
      lv.issued_date as d,
      lv.shift as s,
      count(*) as cnt
    FROM loto_verification lv
    JOIN cutoff_date cd ON true
    WHERE lv.warehouse_code = target_warehouse
      AND lv.issued_date >= (cd.d - days_back)
      AND lv.issued_date < cd.d
    GROUP BY 1, 2
  )
  SELECT
    COALESCE(lc.d, vc.d) as date,
    COALESCE(lc.s, vc.s) as shift,
    COALESCE(lc.cnt, 0) as total_loto,
    COALESCE(vc.cnt, 0) as total_verification,
    CASE WHEN COALESCE(vc.cnt, 0) > 0 THEN
      ROUND((COALESCE(lc.cnt, 0)::numeric / vc.cnt) * 100, 2)
    ELSE
      0
    END as percentage
  FROM loto_counts lc
  FULL OUTER JOIN verification_counts vc ON lc.d = vc.d AND lc.s = vc.s
  ORDER BY 1 ASC, 2 ASC;
END;
$$;

-- 6. Warehouse History (Total - Chart)
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
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END as d,
      count(lr.id) as cnt
    FROM loto_sessions ls
    JOIN cutoff_date cd ON true
    JOIN loto_records lr ON lr.session_id = ls.session_code
    WHERE ls.warehouse_code = target_warehouse
    AND
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END >= (cd.d - days_back)
    AND 
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END < cd.d
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

-- 7. Fuelman Ranking
CREATE OR REPLACE FUNCTION get_loto_ranking_nrp(days_back int DEFAULT 30)
RETURNS TABLE (
  nrp text,
  name text,
  percentage numeric,
  loto_count bigint,
  verification_count bigint
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
      TRIM(ls.fuelman) as fuelman,
      count(lr.id) as cnt
    FROM loto_sessions ls
    JOIN cutoff_date cd ON true
    JOIN loto_records lr ON lr.session_id = ls.session_code
    WHERE 
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END >= (cd.d - days_back)
      AND 
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END < cd.d
    GROUP BY 1
  ),
  verification_counts AS (
    SELECT
      TRIM(ls.fuelman) as fuelman,
      count(lv.id) as cnt
    FROM loto_sessions ls
    JOIN cutoff_date cd ON true
    JOIN loto_verification lv ON lv.session_code = ls.session_code
    WHERE 
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END >= (cd.d - days_back)
      AND 
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
        WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
        ELSE NULL
      END < cd.d
    GROUP BY 1
  ),
  relevant_nrps AS (
    SELECT m.nrp
    FROM manpower m
    WHERE m.position::int = 5 AND m.active = true
    UNION
    SELECT fuelman FROM loto_counts
    UNION
    SELECT fuelman FROM verification_counts
  )
  SELECT
    m.nrp::text,
    m.nama::text as name,
    CASE WHEN COALESCE(vc.cnt, 0) > 0 THEN
      ROUND((COALESCE(lc.cnt, 0)::numeric / vc.cnt) * 100, 2)
    ELSE
      0
    END as percentage,
    COALESCE(lc.cnt, 0) as loto_count,
    COALESCE(vc.cnt, 0) as verification_count
  FROM relevant_nrps rn
  JOIN manpower m ON m.nrp = rn.nrp
  LEFT JOIN loto_counts lc ON lc.fuelman = TRIM(m.nrp)
  LEFT JOIN verification_counts vc ON vc.fuelman = TRIM(m.nrp)
  ORDER BY 3 DESC, 2;
END;
$$;

-- 8. Trend
CREATE OR REPLACE FUNCTION get_loto_achievement_trend(days_back int DEFAULT 30)
RETURNS TABLE (
  date date,
  shift smallint,
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
      (
        CASE 
          WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
          WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
          ELSE NULL
        END
      ) as d,
      -- DYNAMIC SHIFT PARSING
      CASE 
        WHEN ls.session_code ~ '^20\d{6}' THEN 
            CAST(substring(ls.session_code from 9 for (length(ls.session_code) - 8 - 4)) AS SMALLINT)
        WHEN ls.session_code ~ '^\d{6}' THEN 
            CAST(substring(ls.session_code from 7 for (length(ls.session_code) - 6 - 4)) AS SMALLINT)
        ELSE 0::smallint
      END as s,
      count(lr.id) as cnt
    FROM loto_sessions ls
    JOIN cutoff_date cd ON true
    JOIN loto_records lr ON lr.session_id = ls.session_code
    WHERE 
        CASE 
          WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
          WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
          ELSE NULL
        END >= (cd.d - days_back)
      AND 
        CASE 
          WHEN ls.session_code ~ '^20\d{6}' THEN to_date(substring(ls.session_code from 1 for 8), 'YYYYMMDD')
          WHEN ls.session_code ~ '^\d{6}' THEN to_date(substring(ls.session_code from 1 for 6), 'YYMMDD')
          ELSE NULL
        END < cd.d
    GROUP BY 1, 2
  ),
  verification_counts AS (
    SELECT
      lv.issued_date as d,
      lv.shift as s,
      count(*) as cnt
    FROM loto_verification lv
    JOIN cutoff_date cd ON true
    WHERE lv.issued_date >= (cd.d - days_back)
      AND lv.issued_date < cd.d
    GROUP BY 1, 2
  )
  SELECT
    COALESCE(lc.d, vc.d) as date,
    COALESCE(lc.s, vc.s) as shift,
    COALESCE(lc.cnt, 0) as total_loto,
    COALESCE(vc.cnt, 0) as total_verification,
    CASE WHEN COALESCE(vc.cnt, 0) > 0 THEN
      ROUND((COALESCE(lc.cnt, 0)::numeric / vc.cnt) * 100, 2)
    ELSE
      0
    END as percentage
  FROM loto_counts lc
  FULL OUTER JOIN verification_counts vc ON lc.d = vc.d AND lc.s = vc.s
  ORDER BY 1 DESC, 2;
END;
$$;
