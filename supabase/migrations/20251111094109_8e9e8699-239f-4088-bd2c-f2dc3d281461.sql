-- Analytical Layer for Archie: Data-validated inventory analysis functions

-- 1. Inventory Pipeline Calculator with Data Validation
CREATE OR REPLACE FUNCTION public.get_inventory_pipeline(
  p_location_code text DEFAULT 'ALL',
  p_unit_of_measure text DEFAULT 'units',
  p_pipeline_stage text DEFAULT 'both',
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  total_value numeric,
  on_order_value numeric,
  in_transit_value numeric,
  new_assignment_value numeric,
  replenishment_value numeric,
  data_points integer,
  has_sufficient_data boolean,
  data_quality_note text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_start_date date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end_date date := COALESCE(p_end_date, CURRENT_DATE);
  v_total numeric := 0;
  v_on_order numeric := 0;
  v_in_transit numeric := 0;
  v_new_assign numeric := 0;
  v_replenish numeric := 0;
  v_count integer := 0;
BEGIN
  -- Calculate pipeline values based on unit of measure
  IF p_unit_of_measure = 'cost' THEN
    SELECT 
      COUNT(*)::integer,
      COALESCE(SUM(CASE WHEN p_pipeline_stage IN ('on_order', 'both') THEN fd.on_order_units * p.unit_cost ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN p_pipeline_stage IN ('in_transit', 'both') THEN fd.in_transit_units * p.unit_cost ELSE 0 END), 0)
    INTO v_count, v_on_order, v_in_transit
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND fd.d >= v_start_date AND fd.d <= v_end_date
      AND (fd.on_order_units > 0 OR fd.in_transit_units > 0);
      
  ELSIF p_unit_of_measure = 'retail' THEN
    SELECT 
      COUNT(*)::integer,
      COALESCE(SUM(CASE WHEN p_pipeline_stage IN ('on_order', 'both') THEN fd.on_order_units * p.unit_price ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN p_pipeline_stage IN ('in_transit', 'both') THEN fd.in_transit_units * p.unit_price ELSE 0 END), 0)
    INTO v_count, v_on_order, v_in_transit
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND fd.d >= v_start_date AND fd.d <= v_end_date
      AND (fd.on_order_units > 0 OR fd.in_transit_units > 0);
      
  ELSE -- units
    SELECT 
      COUNT(*)::integer,
      COALESCE(SUM(CASE WHEN p_pipeline_stage IN ('on_order', 'both') THEN fd.on_order_units ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN p_pipeline_stage IN ('in_transit', 'both') THEN fd.in_transit_units ELSE 0 END), 0)
    INTO v_count, v_on_order, v_in_transit
    FROM aifo.fact_daily fd
    WHERE (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND fd.d >= v_start_date AND fd.d <= v_end_date
      AND (fd.on_order_units > 0 OR fd.in_transit_units > 0);
  END IF;

  v_total := v_on_order + v_in_transit;
  
  -- For now, set new/replenishment to 0 (requires assignment table implementation)
  v_new_assign := 0;
  v_replenish := v_total;

  RETURN QUERY SELECT 
    v_total,
    v_on_order,
    v_in_transit,
    v_new_assign,
    v_replenish,
    v_count,
    v_count >= 10,
    CASE 
      WHEN v_count = 0 THEN 'No pipeline data found for specified filters'
      WHEN v_count < 10 THEN 'Limited data points - results may not be representative'
      ELSE 'Sufficient data for analysis'
    END;
END;
$function$;

-- 2. Real-time Inventory Snapshot with Freshness Check
CREATE OR REPLACE FUNCTION public.get_latest_inventory_snapshot(
  p_location_code text DEFAULT 'ALL'
)
RETURNS TABLE(
  snapshot_date date,
  total_on_hand numeric,
  total_on_order numeric,
  total_in_transit numeric,
  cost_value numeric,
  retail_value numeric,
  data_freshness_days integer,
  missing_locations text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_latest_date date;
  v_freshness integer;
BEGIN
  -- Get most recent data date
  SELECT MAX(d) INTO v_latest_date
  FROM aifo.fact_daily
  WHERE (p_location_code = 'ALL' OR location_code = p_location_code);

  IF v_latest_date IS NULL THEN
    RETURN QUERY SELECT 
      NULL::date, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 
      NULL::integer, ARRAY[]::text[];
    RETURN;
  END IF;

  v_freshness := (CURRENT_DATE - v_latest_date)::integer;

  RETURN QUERY
  SELECT 
    v_latest_date,
    COALESCE(SUM(fd.on_hand_units), 0),
    COALESCE(SUM(fd.on_order_units), 0),
    COALESCE(SUM(fd.in_transit_units), 0),
    COALESCE(SUM(fd.on_hand_units * p.unit_cost), 0),
    COALESCE(SUM(fd.on_hand_units * p.unit_price), 0),
    v_freshness,
    ARRAY[]::text[] -- Missing locations calculation would require location list
  FROM aifo.fact_daily fd
  JOIN aifo.products p ON fd.sku = p.sku
  WHERE fd.d = v_latest_date
    AND (p_location_code = 'ALL' OR fd.location_code = p_location_code);
END;
$function$;

-- 3. Custom Metric Calculator with Confidence Scoring
CREATE OR REPLACE FUNCTION public.calculate_inventory_metric(
  p_location_code text,
  p_metric_type text,
  p_grouping text DEFAULT 'category',
  p_date_range text DEFAULT '90_days'
)
RETURNS TABLE(
  group_name text,
  metric_value numeric,
  sku_count integer,
  confidence_level text,
  data_gaps text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_start_date date;
  v_end_date date := CURRENT_DATE;
  v_expected_days integer;
  v_actual_days integer;
BEGIN
  -- Calculate date range
  v_start_date := CASE 
    WHEN p_date_range = '30_days' THEN v_end_date - INTERVAL '30 days'
    WHEN p_date_range = '180_days' THEN v_end_date - INTERVAL '180 days'
    ELSE v_end_date - INTERVAL '90 days'
  END;

  v_expected_days := (v_end_date - v_start_date)::integer;

  -- Check data completeness
  SELECT COUNT(DISTINCT d)::integer INTO v_actual_days
  FROM aifo.fact_daily
  WHERE (p_location_code = 'ALL' OR location_code = p_location_code)
    AND d >= v_start_date AND d <= v_end_date;

  -- Execute metric-specific query
  IF p_metric_type = 'slow_moving' THEN
    RETURN QUERY
    WITH sku_sales AS (
      SELECT 
        fd.sku,
        COALESCE(p.group_1, 'Uncategorized') as category,
        SUM(fd.units_sold) as total_sales,
        AVG(fd.on_hand_units) as avg_inventory
      FROM aifo.fact_daily fd
      JOIN aifo.products p ON fd.sku = p.sku
      WHERE (p_location_code = 'ALL' OR fd.location_code = p_location_code)
        AND fd.d >= v_start_date AND fd.d <= v_end_date
      GROUP BY fd.sku, p.group_1
      HAVING SUM(fd.units_sold) < 10 AND AVG(fd.on_hand_units) > 5
    )
    SELECT 
      category,
      COUNT(*)::numeric,
      COUNT(*)::integer,
      CASE 
        WHEN v_actual_days::numeric / v_expected_days < 0.7 THEN 'low'
        WHEN v_actual_days::numeric / v_expected_days < 0.9 THEN 'medium'
        ELSE 'high'
      END,
      CASE 
        WHEN v_actual_days < v_expected_days 
        THEN ARRAY['Missing ' || (v_expected_days - v_actual_days)::text || ' days in date range']
        ELSE ARRAY[]::text[]
      END
    FROM sku_sales
    GROUP BY category;

  ELSIF p_metric_type = 'overstocked' THEN
    RETURN QUERY
    WITH sku_overstock AS (
      SELECT 
        fd.sku,
        COALESCE(p.group_1, 'Uncategorized') as category,
        AVG(fd.on_hand_units) as avg_inventory,
        AVG(fd.target_units) as avg_target
      FROM aifo.fact_daily fd
      JOIN aifo.products p ON fd.sku = p.sku
      WHERE (p_location_code = 'ALL' OR fd.location_code = p_location_code)
        AND fd.d >= v_start_date AND fd.d <= v_end_date
        AND fd.target_units IS NOT NULL
      GROUP BY fd.sku, p.group_1
      HAVING AVG(fd.on_hand_units) > AVG(fd.target_units) * 1.5
    )
    SELECT 
      category,
      COUNT(*)::numeric,
      COUNT(*)::integer,
      CASE 
        WHEN v_actual_days::numeric / v_expected_days < 0.7 THEN 'low'
        WHEN v_actual_days::numeric / v_expected_days < 0.9 THEN 'medium'
        ELSE 'high'
      END,
      CASE 
        WHEN v_actual_days < v_expected_days 
        THEN ARRAY['Missing ' || (v_expected_days - v_actual_days)::text || ' days in date range']
        ELSE ARRAY[]::text[]
      END
    FROM sku_overstock
    GROUP BY category;

  ELSE
    -- Default: return empty result for unknown metric types
    RETURN;
  END IF;
END;
$function$;