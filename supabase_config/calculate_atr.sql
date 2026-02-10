-- Create RPC function to calculate ATR (Attendance Ratio)
CREATE OR REPLACE FUNCTION calculate_atr(
    target_year INTEGER,
    target_month INTEGER,
    target_day INTEGER DEFAULT NULL  -- NULL means calculate for whole month up to today if current month
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    first_day DATE;
    last_day DATE;
    days_to_count INTEGER;
    total_manpower INTEGER;
    total_planned INTEGER;
    total_deductions INTEGER;
    atr_ratio NUMERIC;
    is_current_month BOOLEAN;
BEGIN
    -- Calculate date range
    first_day := make_date(target_year, target_month, 1);
    last_day := (first_day + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    -- Check if it's the current month
    is_current_month := (
        EXTRACT(YEAR FROM CURRENT_DATE) = target_year AND 
        EXTRACT(MONTH FROM CURRENT_DATE) = target_month
    );
    
    -- Determine days to count
    IF is_current_month AND target_day IS NULL THEN
        days_to_count := EXTRACT(DAY FROM CURRENT_DATE)::INTEGER;
    ELSIF target_day IS NOT NULL THEN
        days_to_count := target_day;
    ELSE
        days_to_count := EXTRACT(DAY FROM last_day)::INTEGER;
    END IF;
    
    -- Get count of active manpower in positions 2-5
    SELECT COUNT(*)
    INTO total_manpower
    FROM manpower
    WHERE position IN (2, 3, 4, 5)
      AND active = true;
    
    -- Calculate total planned attendance
    total_planned := total_manpower * days_to_count;
    
    -- Count deductions (sick, leave, alpha, late, early_leave)
    SELECT COUNT(*)
    INTO total_deductions
    FROM attendance a
    WHERE a.work_date >= first_day
      AND a.work_date <= last_day
      AND a.nrp IN (
          SELECT nrp 
          FROM manpower 
          WHERE position IN (2, 3, 4, 5) 
            AND active = true
      )
      AND (
          a.is_sick = true OR 
          a.is_leave = true OR 
          a.is_alpha = true OR 
          a.is_late = true OR 
          a.is_early_leave = true
      );
    
    -- Calculate ratio
    IF total_planned > 0 THEN
        atr_ratio := ((total_planned - total_deductions)::NUMERIC / total_planned::NUMERIC) * 100;
    ELSE
        atr_ratio := 100;
    END IF;
    
    RETURN json_build_object(
        'ratio', atr_ratio,
        'total_planned', total_planned,
        'total_deductions', total_deductions,
        'days_counted', days_to_count
    );
END;
$$;
