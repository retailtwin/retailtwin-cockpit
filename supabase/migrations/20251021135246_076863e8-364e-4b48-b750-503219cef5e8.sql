-- Create function to get aggregated KPI data
CREATE OR REPLACE FUNCTION public.get_kpi_data_aggregated(
  p_location_code text,
  p_sku text
)
RETURNS TABLE(
  location_code text,
  sku text,
  days_total integer,
  tcm numeric,
  turns_current numeric,
  turns_sim numeric,
  stockout_days bigint,
  stockout_days_sim bigint,
  mtv numeric,
  service_level numeric,
  missed_units numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
DECLARE
  v_total_units_sold numeric;
  v_avg_on_hand numeric;
  v_avg_on_hand_sim numeric;
  v_total_stockout_days bigint;
  v_total_stockout_days_sim bigint;
  v_total_sku_loc_days bigint;
  v_total_available_days bigint;
  v_total_available_days_sim bigint;
  v_service_level numeric;
  v_service_level_sim numeric;
  v_turns_current numeric;
  v_turns_sim numeric;
BEGIN
  -- Aggregate sales and inventory across selected SKUs/locations
  SELECT 
    COALESCE(SUM(units_sold), 0),
    COALESCE(AVG(on_hand_units), 0),
    COALESCE(AVG(on_hand_units_sim), 0),
    COUNT(*) FILTER (WHERE on_hand_units = 0 OR on_hand_units IS NULL),
    COUNT(*) FILTER (WHERE on_hand_units_sim = 0 OR on_hand_units_sim IS NULL)
  INTO v_total_units_sold, v_avg_on_hand, v_avg_on_hand_sim, v_total_stockout_days, v_total_stockout_days_sim
  FROM aifo.fact_daily
  WHERE 
    (p_location_code = 'ALL' OR location_code = p_location_code)
    AND (p_sku = 'ALL' OR sku = p_sku);

  -- Calculate service level: total SKULocDays between first and last on_hand>0 vs actual days with on_hand>0
  WITH sku_date_ranges AS (
    SELECT 
      location_code,
      sku,
      MIN(d) FILTER (WHERE on_hand_units > 0) as first_day,
      MAX(d) FILTER (WHERE on_hand_units > 0) as last_day,
      COUNT(*) FILTER (WHERE on_hand_units > 0) as available_days
    FROM aifo.fact_daily
    WHERE 
      (p_location_code = 'ALL' OR location_code = p_location_code)
      AND (p_sku = 'ALL' OR sku = p_sku)
    GROUP BY location_code, sku
  )
  SELECT 
    COALESCE(SUM(EXTRACT(DAY FROM (last_day - first_day)) + 1), 0),
    COALESCE(SUM(available_days), 0)
  INTO v_total_sku_loc_days, v_total_available_days
  FROM sku_date_ranges
  WHERE first_day IS NOT NULL AND last_day IS NOT NULL;

  -- Service level for simulated data
  WITH sku_date_ranges_sim AS (
    SELECT 
      location_code,
      sku,
      MIN(d) FILTER (WHERE on_hand_units_sim > 0) as first_day,
      MAX(d) FILTER (WHERE on_hand_units_sim > 0) as last_day,
      COUNT(*) FILTER (WHERE on_hand_units_sim > 0) as available_days_sim
    FROM aifo.fact_daily
    WHERE 
      (p_location_code = 'ALL' OR location_code = p_location_code)
      AND (p_sku = 'ALL' OR sku = p_sku)
    GROUP BY location_code, sku
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

  -- Calculate turns: total sales / average inventory
  v_turns_current := CASE 
    WHEN v_avg_on_hand > 0 THEN v_total_units_sold / v_avg_on_hand
    ELSE 0
  END;

  v_turns_sim := CASE 
    WHEN v_avg_on_hand_sim > 0 THEN v_total_units_sold / v_avg_on_hand_sim
    ELSE 0
  END;

  RETURN QUERY
  SELECT 
    CASE WHEN p_location_code = 'ALL' THEN 'ALL' ELSE p_location_code END,
    CASE WHEN p_sku = 'ALL' THEN 'ALL' ELSE p_sku END,
    365 as days_total,
    NULL::numeric as tcm,
    v_turns_current,
    v_turns_sim,
    v_total_stockout_days,
    v_total_stockout_days_sim,
    NULL::numeric as mtv,
    v_service_level,
    NULL::numeric as missed_units;
END;
$$;

-- Create function to get aggregated daily fact data
CREATE OR REPLACE FUNCTION public.get_fact_daily_aggregated(
  p_location_code text,
  p_sku text
)
RETURNS TABLE(
  d date,
  location_code text,
  sku text,
  units_sold numeric,
  on_hand_units numeric,
  on_hand_units_sim numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
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
  GROUP BY d
  ORDER BY d;
$$;