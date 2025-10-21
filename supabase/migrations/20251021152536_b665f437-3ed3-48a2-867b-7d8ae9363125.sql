-- Update get_kpi_data_aggregated to correctly calculate inventory turns
-- by summing per-SKU average inventories instead of averaging across all rows
CREATE OR REPLACE FUNCTION public.get_kpi_data_aggregated(p_location_code text, p_sku text)
 RETURNS TABLE(location_code text, sku text, days_total integer, sku_loc_days integer, tcm numeric, turns_current numeric, turns_sim numeric, mtv numeric, service_level numeric, service_level_sim numeric, missed_units numeric)
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
    AND (p_sku = 'ALL' OR fd.sku = p_sku);

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
    AND (p_sku = 'ALL' OR fd.sku = p_sku);

  -- Calculate SKU·Loc·Days: count actual distinct (location, sku, date) combinations
  SELECT 
    COUNT(DISTINCT (fd.location_code, fd.sku, fd.d))
  INTO v_actual_sku_loc_days
  FROM aifo.fact_daily fd
  WHERE 
    (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku = p_sku);

  -- Calculate service level: total possible SKULocDays vs actual days with on_hand>0
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

  -- Calculate inventory turns: total sales value / sum of per-SKU average inventory
  v_turns_current := CASE 
    WHEN v_avg_inventory_value > 0 THEN v_total_sales_value / v_avg_inventory_value
    ELSE 0
  END;

  v_turns_sim := CASE 
    WHEN v_avg_inventory_value_sim > 0 THEN v_total_sales_value / v_avg_inventory_value_sim
    ELSE 0
  END;

  -- Calculate TCM (Throughput Cash Margin): total sales value - total cost
  WITH margin_calc AS (
    SELECT 
      SUM(fd.units_sold * (p.unit_price - p.unit_cost)) as total_margin
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
  )
  SELECT COALESCE(total_margin, 0) INTO v_tcm FROM margin_calc;

  -- Calculate MTV (Missed Throughput Value): missed sales opportunity
  WITH stockout_calc AS (
    SELECT 
      SUM(CASE WHEN fd.on_hand_units <= 0 THEN fd.units_sold * (p.unit_price - p.unit_cost) ELSE 0 END) as missed_value
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
  )
  SELECT COALESCE(missed_value, 0) INTO v_mtv FROM stockout_calc;

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
    v_missed_units;
END;
$function$;