-- Update calculate_riv to use daily average instead of last day snapshot
CREATE OR REPLACE FUNCTION public.calculate_riv(
  p_location_code text, 
  p_sku text,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_avg_riv numeric := 0;
BEGIN
  -- Calculate RIV for each day, then average across all days in range
  WITH daily_riv AS (
    SELECT 
      fd.d,
      SUM(
        CASE 
          WHEN fd.economic_units > fd.target_units 
          THEN (fd.economic_units - fd.target_units) * p.cost_price
          ELSE 0 
        END
      ) as day_riv
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
      AND (p_start_date IS NULL OR fd.d >= p_start_date)
      AND (p_end_date IS NULL OR fd.d <= p_end_date)
    GROUP BY fd.d
  )
  SELECT 
    COALESCE(AVG(day_riv), 0)
  INTO v_avg_riv
  FROM daily_riv;

  RETURN v_avg_riv;
END;
$function$;

-- Update get_kpi_data_aggregated to accept date range parameters
CREATE OR REPLACE FUNCTION public.get_kpi_data_aggregated(
  p_location_code text, 
  p_sku text,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(location_code text, sku text, days_total integer, sku_loc_days integer, tcm numeric, turns_current numeric, turns_sim numeric, mtv numeric, service_level numeric, service_level_sim numeric, missed_units numeric, riv numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_total_sales_value numeric;
  v_avg_inventory_value numeric;
  v_avg_inventory_value_sim numeric;
  v_total_sku_loc_days integer;
  v_actual_sku_loc_days integer;
  v_total_available_days bigint;
  v_total_available_days_sim bigint;
  v_service_level numeric;
  v_service_level_sim numeric;
  v_turns_current numeric;
  v_turns_sim numeric;
  v_tcm numeric;
  v_mtv numeric;
  v_missed_units numeric;
  v_days_in_range integer;
  v_riv numeric;
BEGIN
  -- Calculate total sales value at cost and missed units
  SELECT 
    COALESCE(SUM(fd.units_sold * p.unit_cost), 0),
    COALESCE(SUM(fd.units_sold), 0)
  INTO v_total_sales_value, v_missed_units
  FROM aifo.fact_daily fd
  JOIN aifo.products p ON fd.sku = p.sku
  WHERE 
    (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku = p_sku)
    AND (p_start_date IS NULL OR fd.d >= p_start_date)
    AND (p_end_date IS NULL OR fd.d <= p_end_date);

  -- Calculate average inventory per SKU, then sum across SKUs
  WITH sku_inventory_averages AS (
    SELECT 
      fd.sku,
      AVG(fd.on_hand_units * p.unit_cost) as avg_inventory_value_per_sku,
      AVG(fd.on_hand_units_sim * p.unit_cost) as avg_inventory_value_sim_per_sku
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
      AND (p_start_date IS NULL OR fd.d >= p_start_date)
      AND (p_end_date IS NULL OR fd.d <= p_end_date)
    GROUP BY fd.sku
  )
  SELECT 
    COALESCE(SUM(avg_inventory_value_per_sku), 0),
    COALESCE(SUM(avg_inventory_value_sim_per_sku), 0)
  INTO v_avg_inventory_value, v_avg_inventory_value_sim
  FROM sku_inventory_averages;

  -- Calculate actual days in date range
  SELECT 
    COALESCE((MAX(fd.d) - MIN(fd.d))::integer + 1, 0)
  INTO v_days_in_range
  FROM aifo.fact_daily fd
  WHERE 
    (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku = p_sku)
    AND (p_start_date IS NULL OR fd.d >= p_start_date)
    AND (p_end_date IS NULL OR fd.d <= p_end_date);

  -- Calculate SKU·Loc·Days
  SELECT 
    COUNT(DISTINCT (fd.location_code, fd.sku, fd.d))
  INTO v_actual_sku_loc_days
  FROM aifo.fact_daily fd
  WHERE 
    (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku = p_sku)
    AND (p_start_date IS NULL OR fd.d >= p_start_date)
    AND (p_end_date IS NULL OR fd.d <= p_end_date);

  -- Calculate service level
  WITH sku_date_ranges AS (
    SELECT 
      fd.location_code,
      fd.sku,
      MIN(fd.d) FILTER (WHERE fd.on_hand_units > 0) as first_day,
      MAX(fd.d) FILTER (WHERE fd.on_hand_units > 0) as last_day,
      COUNT(*) FILTER (WHERE fd.on_hand_units > 0) as available_days
    FROM aifo.fact_daily fd
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
      AND (p_start_date IS NULL OR fd.d >= p_start_date)
      AND (p_end_date IS NULL OR fd.d <= p_end_date)
    GROUP BY fd.location_code, fd.sku
  )
  SELECT 
    COALESCE(SUM((last_day - first_day) + 1), 0),
    COALESCE(SUM(available_days), 0)
  INTO v_total_sku_loc_days, v_total_available_days
  FROM sku_date_ranges
  WHERE first_day IS NOT NULL AND last_day IS NOT NULL;

  -- Service level for simulated data
  WITH sku_date_ranges_sim AS (
    SELECT 
      fd.location_code,
      fd.sku,
      MIN(fd.d) FILTER (WHERE fd.on_hand_units_sim > 0) as first_day,
      MAX(fd.d) FILTER (WHERE fd.on_hand_units_sim > 0) as last_day,
      COUNT(*) FILTER (WHERE fd.on_hand_units_sim > 0) as available_days_sim
    FROM aifo.fact_daily fd
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
      AND (p_start_date IS NULL OR fd.d >= p_start_date)
      AND (p_end_date IS NULL OR fd.d <= p_end_date)
    GROUP BY fd.location_code, fd.sku
  )
  SELECT 
    COALESCE(SUM(available_days_sim), 0)
  INTO v_total_available_days_sim
  FROM sku_date_ranges_sim
  WHERE first_day IS NOT NULL AND last_day IS NOT NULL;

  -- Calculate service levels
  v_service_level := CASE 
    WHEN v_total_sku_loc_days > 0 THEN v_total_available_days::numeric / v_total_sku_loc_days
    ELSE 0
  END;

  v_service_level_sim := CASE 
    WHEN v_total_sku_loc_days > 0 THEN v_total_available_days_sim::numeric / v_total_sku_loc_days
    ELSE 0
  END;

  -- Calculate inventory turns
  v_turns_current := CASE 
    WHEN v_avg_inventory_value > 0 THEN v_total_sales_value / v_avg_inventory_value
    ELSE 0
  END;

  v_turns_sim := CASE 
    WHEN v_avg_inventory_value_sim > 0 THEN v_total_sales_value / v_avg_inventory_value_sim
    ELSE 0
  END;

  -- Calculate TCM
  WITH margin_calc AS (
    SELECT 
      SUM(fd.units_sold * (p.unit_price - p.unit_cost)) as total_margin
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
      AND (p_start_date IS NULL OR fd.d >= p_start_date)
      AND (p_end_date IS NULL OR fd.d <= p_end_date)
  )
  SELECT COALESCE(total_margin, 0) INTO v_tcm FROM margin_calc;

  -- Calculate MTV as the difference between simulated and current throughput
  v_mtv := CASE 
    WHEN v_service_level > 0 THEN (v_tcm / v_service_level) - v_tcm
    ELSE 0
  END;

  -- Calculate RIV using the updated function with date range
  v_riv := calculate_riv(p_location_code, p_sku, p_start_date, p_end_date);

  RETURN QUERY
  SELECT 
    CASE WHEN p_location_code = 'ALL' THEN 'ALL' ELSE p_location_code END,
    CASE WHEN p_sku = 'ALL' THEN 'ALL' ELSE p_sku END,
    v_days_in_range,
    v_actual_sku_loc_days,
    v_tcm,
    v_turns_current,
    v_turns_sim,
    v_mtv,
    v_service_level,
    v_service_level_sim,
    v_missed_units,
    v_riv;
END;
$function$;

-- Update get_fact_daily_aggregated to accept date range parameters
CREATE OR REPLACE FUNCTION public.get_fact_daily_aggregated(
  p_location_code text, 
  p_sku text,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(d date, location_code text, sku text, units_sold numeric, on_hand_units numeric, on_hand_units_sim numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
  SELECT 
    d,
    CASE WHEN p_location_code = 'ALL' THEN 'ALL' ELSE p_location_code END as location_code,
    CASE WHEN p_sku = 'ALL' THEN 'ALL' ELSE p_sku END as sku,
    SUM(units_sold) as units_sold,
    SUM(on_hand_units) as on_hand_units,
    SUM(on_hand_units_sim) as on_hand_units_sim
  FROM aifo.fact_daily
  WHERE 
    (p_location_code = 'ALL' OR location_code = p_location_code)
    AND (p_sku = 'ALL' OR sku = p_sku)
    AND (p_start_date IS NULL OR d >= p_start_date)
    AND (p_end_date IS NULL OR d <= p_end_date)
  GROUP BY d
  ORDER BY d;
$function$;