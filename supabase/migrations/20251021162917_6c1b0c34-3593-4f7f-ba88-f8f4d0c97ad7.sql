-- Add new columns to fact_daily table for enhanced inventory analysis
ALTER TABLE aifo.fact_daily 
ADD COLUMN IF NOT EXISTS target_units numeric,
ADD COLUMN IF NOT EXISTS economic_units numeric,
ADD COLUMN IF NOT EXISTS economic_overstock_units numeric;

-- Add pricing columns to products table
ALTER TABLE aifo.products 
ADD COLUMN IF NOT EXISTS cost_price numeric,
ADD COLUMN IF NOT EXISTS sales_price numeric;

-- Drop existing functions to allow signature changes
DROP FUNCTION IF EXISTS public.get_kpi_data_aggregated(text, text);
DROP FUNCTION IF EXISTS public.get_kpi_data(text, text);
DROP FUNCTION IF EXISTS public.calculate_riv(text, text);

-- Update the insert_fact_daily_batch function to handle new columns
CREATE OR REPLACE FUNCTION public.insert_fact_daily_batch(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.fact_daily (
    d, location_code, sku, units_sold, on_hand_units, on_order_units, 
    in_transit_units, on_hand_units_sim, target_units, economic_units, 
    economic_overstock_units
  )
  SELECT 
    (r->>'d')::date,
    r->>'location_code',
    r->>'sku',
    (r->>'units_sold')::numeric,
    CASE WHEN r->>'on_hand_units' = '' THEN NULL ELSE (r->>'on_hand_units')::numeric END,
    COALESCE((r->>'on_order_units')::integer, 0),
    COALESCE((r->>'in_transit_units')::integer, 0),
    CASE WHEN r->>'on_hand_units_sim' = '' THEN NULL ELSE (r->>'on_hand_units_sim')::numeric END,
    CASE WHEN r->>'target_units' = '' THEN NULL ELSE (r->>'target_units')::numeric END,
    CASE WHEN r->>'economic_units' = '' THEN NULL ELSE (r->>'economic_units')::numeric END,
    CASE WHEN r->>'economic_overstock_units' = '' THEN NULL ELSE (r->>'economic_overstock_units')::numeric END
  FROM jsonb_array_elements(records) AS r;
END;
$function$;

-- Create function to calculate RIV (Redundant Inventory Value)
CREATE FUNCTION public.calculate_riv(p_location_code text, p_sku text)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_total_riv numeric := 0;
BEGIN
  -- Calculate RIV: sum of (economic_units - target_units) * cost_price
  -- Only for days within the on_hand > 0 date range where economic > target
  WITH sku_date_ranges AS (
    SELECT 
      fd.location_code,
      fd.sku,
      MIN(fd.d) FILTER (WHERE fd.on_hand_units > 0) as first_day,
      MAX(fd.d) FILTER (WHERE fd.on_hand_units > 0) as last_day
    FROM aifo.fact_daily fd
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
    GROUP BY fd.location_code, fd.sku
  )
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN fd.economic_units > fd.target_units 
        THEN (fd.economic_units - fd.target_units) * p.cost_price
        ELSE 0 
      END
    ), 0)
  INTO v_total_riv
  FROM aifo.fact_daily fd
  JOIN aifo.products p ON fd.sku = p.sku
  JOIN sku_date_ranges sdr ON fd.location_code = sdr.location_code 
    AND fd.sku = sdr.sku
  WHERE 
    (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku = p_sku)
    AND fd.d BETWEEN sdr.first_day AND sdr.last_day
    AND sdr.first_day IS NOT NULL 
    AND sdr.last_day IS NOT NULL;

  RETURN v_total_riv;
END;
$function$;

-- Create get_kpi_data_aggregated with RIV support
CREATE FUNCTION public.get_kpi_data_aggregated(p_location_code text, p_sku text)
RETURNS TABLE(
  location_code text, 
  sku text, 
  days_total integer, 
  sku_loc_days integer, 
  tcm numeric, 
  turns_current numeric, 
  turns_sim numeric, 
  mtv numeric, 
  service_level numeric, 
  service_level_sim numeric, 
  missed_units numeric,
  riv numeric
)
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

  -- Calculate SKU·Loc·Days
  SELECT 
    COUNT(DISTINCT (fd.location_code, fd.sku, fd.d))
  INTO v_actual_sku_loc_days
  FROM aifo.fact_daily fd
  WHERE 
    (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku = p_sku);

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
  )
  SELECT COALESCE(total_margin, 0) INTO v_tcm FROM margin_calc;

  -- Calculate MTV
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

  -- Calculate RIV
  v_riv := calculate_riv(p_location_code, p_sku);

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

-- Create get_kpi_data with RIV support
CREATE FUNCTION public.get_kpi_data(p_location_code text, p_sku text)
RETURNS TABLE(
  location_code text, 
  sku text, 
  days_total integer, 
  sku_loc_days integer, 
  tcm numeric, 
  turns_current numeric, 
  turns_sim numeric, 
  mtv numeric, 
  service_level numeric, 
  service_level_sim numeric, 
  missed_units numeric,
  riv numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_riv numeric;
BEGIN
  -- Calculate RIV for specific location/SKU
  v_riv := calculate_riv(p_location_code, p_sku);

  RETURN QUERY
  SELECT 
    kc.location_code, 
    kc.sku, 
    kc.days_total,
    kc.days_total as sku_loc_days,
    kc.tcm,
    kc.turns_current,
    kc.turns_sim,
    kc.mtv,
    kc.service_level,
    kc.service_level as service_level_sim,
    kc.missed_units,
    v_riv
  FROM aifo.kpi_current kc
  WHERE kc.location_code = p_location_code 
    AND kc.sku = p_sku;
END;
$function$;