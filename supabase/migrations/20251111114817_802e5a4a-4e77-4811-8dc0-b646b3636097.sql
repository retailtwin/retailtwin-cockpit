-- Drop and recreate get_kpi_data_aggregated with riv_sim
DROP FUNCTION IF EXISTS public.get_kpi_data_aggregated(text, text, date, date);

CREATE OR REPLACE FUNCTION public.get_kpi_data_aggregated(p_location_code text, p_sku text, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(location_code text, sku text, days_total integer, sku_loc_days integer, tcm numeric, turns_current numeric, turns_sim numeric, mtv numeric, service_level numeric, service_level_sim numeric, missed_units numeric, riv numeric, riv_sim numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_total_sales_value numeric;
  v_avg_inventory_value numeric;
  v_avg_inventory_value_sim numeric;
  v_actual_sku_loc_days integer;
  v_service_level numeric;
  v_service_level_sim numeric;
  v_turns_current numeric;
  v_turns_sim numeric;
  v_tcm numeric;
  v_mtv numeric;
  v_missed_units numeric;
  v_days_in_range integer;
  v_riv numeric;
  v_riv_sim numeric;
BEGIN
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

  SELECT 
    COALESCE(AVG(daily_inventory_value), 0),
    COALESCE(AVG(daily_inventory_value_sim), 0)
  INTO v_avg_inventory_value, v_avg_inventory_value_sim
  FROM (
    SELECT 
      fd.d,
      SUM(fd.on_hand_units * p.unit_cost) as daily_inventory_value,
      SUM(fd.on_hand_units_sim * p.unit_cost) as daily_inventory_value_sim
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
      AND (p_start_date IS NULL OR fd.d >= p_start_date)
      AND (p_end_date IS NULL OR fd.d <= p_end_date)
    GROUP BY fd.d
  ) daily_totals;

  SELECT 
    COALESCE((MAX(fd.d) - MIN(fd.d))::integer + 1, 0)
  INTO v_days_in_range
  FROM aifo.fact_daily fd
  WHERE 
    (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku = p_sku)
    AND (p_start_date IS NULL OR fd.d >= p_start_date)
    AND (p_end_date IS NULL OR fd.d <= p_end_date);

  SELECT 
    COUNT(DISTINCT (fd.location_code, fd.sku, fd.d))
  INTO v_actual_sku_loc_days
  FROM aifo.fact_daily fd
  WHERE 
    (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku = p_sku)
    AND (p_start_date IS NULL OR fd.d >= p_start_date)
    AND (p_end_date IS NULL OR fd.d <= p_end_date);

  WITH sku_service_levels AS (
    SELECT 
      fd.location_code,
      fd.sku,
      COUNT(*) FILTER (WHERE fd.on_hand_units > 0)::numeric / NULLIF(COUNT(*), 0)::numeric as sku_service_level,
      COUNT(*) as total_days
    FROM aifo.fact_daily fd
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
      AND (p_start_date IS NULL OR fd.d >= p_start_date)
      AND (p_end_date IS NULL OR fd.d <= p_end_date)
    GROUP BY fd.location_code, fd.sku
  )
  SELECT 
    COALESCE(
      SUM(sku_service_level * total_days) / NULLIF(SUM(total_days), 0), 
      0
    )
  INTO v_service_level
  FROM sku_service_levels;

  WITH sku_service_levels_sim AS (
    SELECT 
      fd.location_code,
      fd.sku,
      COUNT(*) FILTER (WHERE fd.on_hand_units_sim > 0)::numeric / NULLIF(COUNT(*), 0)::numeric as sku_service_level_sim,
      COUNT(*) as total_days
    FROM aifo.fact_daily fd
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
      AND (p_start_date IS NULL OR fd.d >= p_start_date)
      AND (p_end_date IS NULL OR fd.d <= p_end_date)
    GROUP BY fd.location_code, fd.sku
  )
  SELECT 
    COALESCE(
      SUM(sku_service_level_sim * total_days) / NULLIF(SUM(total_days), 0), 
      0
    )
  INTO v_service_level_sim
  FROM sku_service_levels_sim;

  v_turns_current := CASE 
    WHEN v_avg_inventory_value > 0 THEN v_total_sales_value / v_avg_inventory_value
    ELSE 0
  END;

  v_turns_sim := CASE 
    WHEN v_avg_inventory_value_sim > 0 THEN v_total_sales_value / v_avg_inventory_value_sim
    ELSE 0
  END;

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

  v_mtv := CASE 
    WHEN v_service_level > 0 THEN (v_tcm / v_service_level) - v_tcm
    ELSE 0
  END;

  -- Calculate current RIV
  v_riv := calculate_riv(p_location_code, p_sku, p_start_date, p_end_date);

  -- Calculate simulated RIV based on simulated inventory
  WITH daily_riv_sim AS (
    SELECT 
      fd.d,
      SUM(
        CASE 
          WHEN fd.on_hand_units_sim + fd.on_order_units + fd.in_transit_units > fd.target_units 
          THEN ((fd.on_hand_units_sim + fd.on_order_units + fd.in_transit_units) - fd.target_units) * p.unit_cost
          ELSE 0 
        END
      ) as day_riv_sim
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
      AND (p_start_date IS NULL OR fd.d >= p_start_date)
      AND (p_end_date IS NULL OR fd.d <= p_end_date)
      AND fd.target_units IS NOT NULL
    GROUP BY fd.d
  )
  SELECT 
    COALESCE(AVG(day_riv_sim), 0)
  INTO v_riv_sim
  FROM daily_riv_sim;

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
    v_riv,
    v_riv_sim;
END;
$function$;