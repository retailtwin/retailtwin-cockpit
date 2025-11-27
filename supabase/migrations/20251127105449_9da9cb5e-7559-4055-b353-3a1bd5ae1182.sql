-- Replace get_contiguous_date_range to use public.fact_daily and return ALL dates in range
CREATE OR REPLACE FUNCTION public.get_contiguous_date_range()
RETURNS TABLE(start_date date, end_date date, valid_days_count integer, total_days integer, completeness integer, valid_dates text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_total_days INTEGER;
  v_valid_dates TEXT[];
BEGIN
  -- Find boundaries: first/last day where location has BOTH inventory AND sales (aggregated across all SKUs)
  WITH daily_has AS (
    SELECT 
      day,
      MAX(CASE WHEN units_on_hand > 0 THEN 1 ELSE 0 END) as has_inventory,
      MAX(CASE WHEN units_sold > 0 THEN 1 ELSE 0 END) as has_sales
    FROM public.fact_daily
    GROUP BY day
  )
  SELECT 
    MIN(day) FILTER (WHERE has_inventory = 1 AND has_sales = 1),
    MAX(day) FILTER (WHERE has_inventory = 1 AND has_sales = 1)
  INTO v_start_date, v_end_date
  FROM daily_has;
  
  -- If no valid boundaries found, return empty result
  IF v_start_date IS NULL OR v_end_date IS NULL THEN
    RETURN QUERY SELECT 
      NULL::date,
      NULL::date,
      0,
      0,
      0,
      ARRAY[]::text[];
    RETURN;
  END IF;
  
  -- Total days = ALL days in range (user's definition: every day between boundaries is valid)
  v_total_days := (v_end_date - v_start_date) + 1;
  
  -- Generate ALL dates in range as valid dates
  SELECT ARRAY_AGG(d::TEXT ORDER BY d)
  INTO v_valid_dates
  FROM generate_series(v_start_date, v_end_date, '1 day'::interval) AS d;
  
  RETURN QUERY SELECT 
    v_start_date,
    v_end_date,
    v_total_days,  -- All days between boundaries are valid
    v_total_days,
    100,           -- 100% completeness (by definition)
    v_valid_dates;
END;
$$;