-- Create RPC function to get contiguous date range with proper aggregation
CREATE OR REPLACE FUNCTION public.get_contiguous_date_range()
RETURNS TABLE (
  start_date DATE,
  end_date DATE,
  valid_days_count INTEGER,
  total_days INTEGER,
  completeness INTEGER,
  valid_dates TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_valid_days INTEGER;
  v_total_days INTEGER;
  v_completeness INTEGER;
  v_valid_dates TEXT[];
BEGIN
  -- Get dates where aggregate inventory > 0 AND aggregate sales > 0
  WITH valid_dates_cte AS (
    SELECT d
    FROM aifo.fact_daily
    GROUP BY d
    HAVING SUM(on_hand_units) > 0 AND SUM(units_sold) > 0
    ORDER BY d
  )
  SELECT 
    MIN(d),
    MAX(d),
    COUNT(*)::INTEGER,
    ARRAY_AGG(d::TEXT ORDER BY d)
  INTO 
    v_start_date,
    v_end_date,
    v_valid_days,
    v_valid_dates
  FROM valid_dates_cte;
  
  -- Calculate total days in span
  v_total_days := (v_end_date - v_start_date) + 1;
  
  -- Calculate completeness percentage
  v_completeness := ROUND((v_valid_days::NUMERIC / v_total_days::NUMERIC) * 100);
  
  -- Return single row
  RETURN QUERY SELECT 
    v_start_date,
    v_end_date,
    v_valid_days,
    v_total_days,
    v_completeness,
    v_valid_dates;
END;
$$;