-- Security Fix: Add search_path to all SECURITY DEFINER functions to prevent search path injection attacks

-- Fix upsert_locations_batch
CREATE OR REPLACE FUNCTION public.upsert_locations_batch(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.locations (
    code, name, production_lead_time, shipping_lead_time, order_days
  )
  SELECT 
    r->>'store_code',
    r->>'name',
    COALESCE((r->>'production_lead_time')::integer, 0),
    COALESCE((r->>'shipping_lead_time')::integer, 0),
    COALESCE(r->>'order_days', 'mon,tue,wed,thu,fri,sat,sun')
  FROM jsonb_array_elements(records) AS r
  ON CONFLICT (code) 
  DO UPDATE SET
    name = EXCLUDED.name,
    production_lead_time = EXCLUDED.production_lead_time,
    shipping_lead_time = EXCLUDED.shipping_lead_time,
    order_days = EXCLUDED.order_days;
END;
$function$;

-- Fix upsert_products_batch
CREATE OR REPLACE FUNCTION public.upsert_products_batch(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.products (
    sku, name, unit_cost, unit_price, target_max_units,
    pack_size, minimum_order_quantity, group_1, group_2, group_3
  )
  SELECT 
    r->>'product_code',
    r->>'name',
    (r->>'cost_price')::numeric,
    (r->>'sales_price')::numeric,
    COALESCE((r->>'target_max_units')::numeric, 0),
    COALESCE((r->>'pack_size')::integer, 1),
    COALESCE((r->>'minimum_order_quantity')::integer, 1),
    r->>'group_1',
    r->>'group_2',
    r->>'group_3'
  FROM jsonb_array_elements(records) AS r
  ON CONFLICT (sku) 
  DO UPDATE SET
    name = EXCLUDED.name,
    unit_cost = EXCLUDED.unit_cost,
    unit_price = EXCLUDED.unit_price,
    target_max_units = EXCLUDED.target_max_units,
    pack_size = EXCLUDED.pack_size,
    minimum_order_quantity = EXCLUDED.minimum_order_quantity,
    group_1 = EXCLUDED.group_1,
    group_2 = EXCLUDED.group_2,
    group_3 = EXCLUDED.group_3;
END;
$function$;

-- Fix upsert_inventory_batch
CREATE OR REPLACE FUNCTION public.upsert_inventory_batch(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.fact_daily (
    d, location_code, sku, units_sold, 
    on_hand_units, on_order_units, in_transit_units,
    on_hand_units_sim, target_units, economic_units, economic_overstock_units
  )
  SELECT 
    (r->>'day')::date,
    r->>'store',
    r->>'product',
    COALESCE((r->>'units_sold')::numeric, 0),
    COALESCE((r->>'units_on_hand')::numeric, 0),
    COALESCE((r->>'units_on_order')::integer, 0),
    COALESCE((r->>'units_in_transit')::integer, 0),
    NULL, NULL, NULL, NULL
  FROM jsonb_array_elements(records) AS r
  ON CONFLICT (location_code, sku, d) 
  DO UPDATE SET
    on_hand_units = EXCLUDED.on_hand_units,
    on_order_units = EXCLUDED.on_order_units,
    in_transit_units = EXCLUDED.in_transit_units;
END;
$function$;

-- Fix insert_fact_daily_batch
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

-- Fix update_fact_daily_batch
CREATE OR REPLACE FUNCTION public.update_fact_daily_batch(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  UPDATE aifo.fact_daily
  SET
    target_units = (u->>'target_units')::numeric,
    economic_units = (u->>'economic_units')::numeric,
    economic_overstock_units = (u->>'economic_overstock_units')::numeric
  FROM jsonb_array_elements(updates) AS u
  WHERE 
    fact_daily.location_code = u->>'location_code'
    AND fact_daily.sku = u->>'sku'
    AND fact_daily.d = (u->>'d')::date;
END;
$function$;

-- Fix get_sku_details
CREATE OR REPLACE FUNCTION public.get_sku_details(p_location_code text, p_sku text, p_start_date date, p_end_date date)
RETURNS TABLE(sku text, sku_name text, total_units_sold numeric, avg_daily_sales numeric, stockout_days integer, avg_on_hand numeric, max_on_hand numeric, min_on_hand numeric, days_with_data integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    fd.sku,
    p.name as sku_name,
    SUM(fd.units_sold) as total_units_sold,
    AVG(fd.units_sold) as avg_daily_sales,
    COUNT(*) FILTER (WHERE fd.on_hand_units = 0)::integer as stockout_days,
    AVG(fd.on_hand_units) as avg_on_hand,
    MAX(fd.on_hand_units) as max_on_hand,
    MIN(fd.on_hand_units) as min_on_hand,
    COUNT(*)::integer as days_with_data
  FROM aifo.fact_daily fd
  JOIN aifo.products p ON fd.sku = p.sku
  WHERE 
    (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND fd.sku = p_sku
    AND fd.d >= p_start_date
    AND fd.d <= p_end_date
  GROUP BY fd.sku, p.name;
END;
$function$;

-- Fix get_system_setting
CREATE OR REPLACE FUNCTION public.get_system_setting(p_setting_key text, p_location_code text DEFAULT NULL, p_sku text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_value jsonb;
BEGIN
  IF p_sku IS NOT NULL THEN
    SELECT setting_value INTO v_value FROM system_settings
    WHERE setting_key = p_setting_key AND scope = 'sku' AND scope_ref = p_sku LIMIT 1;
    IF v_value IS NOT NULL THEN RETURN v_value; END IF;
  END IF;
  
  IF p_location_code IS NOT NULL THEN
    SELECT setting_value INTO v_value FROM system_settings
    WHERE setting_key = p_setting_key AND scope = 'location' AND scope_ref = p_location_code LIMIT 1;
    IF v_value IS NOT NULL THEN RETURN v_value; END IF;
  END IF;
  
  SELECT setting_value INTO v_value FROM system_settings
  WHERE setting_key = p_setting_key AND scope = 'global' LIMIT 1;
  
  RETURN v_value;
END;
$function$;

-- Fix get_pareto_analysis
CREATE OR REPLACE FUNCTION public.get_pareto_analysis(p_location_code text, p_sku text DEFAULT 'ALL', p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(sku text, sku_name text, total_units_sold numeric, cumulative_units numeric, cumulative_percent numeric, rank integer, total_skus integer, is_selected_sku boolean, availability_percent numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  RETURN QUERY
  WITH sku_sales AS (
    SELECT 
      fd.sku as sales_sku,
      p.name as sku_name,
      SUM(fd.units_sold) as total_units,
      COUNT(DISTINCT fd.d) FILTER (WHERE fd.on_hand_units > 0)::numeric / 
        NULLIF(COUNT(DISTINCT fd.d), 0)::numeric * 100 as availability_pct
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND fd.d <= p_date
      AND fd.d >= (p_date - INTERVAL '90 days')
    GROUP BY fd.sku, p.name
    HAVING SUM(fd.units_sold) > 0
  ),
  ranked_skus AS (
    SELECT 
      ss.sales_sku,
      ss.sku_name,
      ss.total_units,
      ss.availability_pct,
      ROW_NUMBER() OVER (ORDER BY ss.total_units DESC) as sku_rank,
      SUM(ss.total_units) OVER (ORDER BY ss.total_units DESC) as cumulative,
      SUM(ss.total_units) OVER () as grand_total,
      COUNT(*) OVER () as total_count
    FROM sku_sales ss
  )
  SELECT 
    rs.sales_sku::text,
    rs.sku_name::text,
    rs.total_units,
    rs.cumulative,
    (rs.cumulative / NULLIF(rs.grand_total, 0) * 100)::numeric as cumulative_percent,
    rs.sku_rank::integer,
    rs.total_count::integer,
    (p_sku != 'ALL' AND rs.sales_sku = p_sku) as is_selected_sku,
    rs.availability_pct
  FROM ranked_skus rs
  ORDER BY rs.sku_rank;
END;
$function$;

-- Fix get_top_skus_by_metric
CREATE OR REPLACE FUNCTION public.get_top_skus_by_metric(p_location_code text, p_metric text, p_limit integer DEFAULT 10, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE(sku text, sku_name text, metric_value numeric, units_sold numeric, avg_inventory numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_start_date date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '90 days');
  v_end_date date := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
  IF p_metric = 'sales' THEN
    RETURN QUERY
    SELECT 
      fd.sku,
      p.name as sku_name,
      SUM(fd.units_sold) as metric_value,
      SUM(fd.units_sold) as units_sold,
      AVG(fd.on_hand_units) as avg_inventory
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND fd.d >= v_start_date
      AND fd.d <= v_end_date
    GROUP BY fd.sku, p.name
    ORDER BY metric_value DESC
    LIMIT p_limit;
    
  ELSIF p_metric = 'stockout_days' THEN
    RETURN QUERY
    SELECT 
      fd.sku,
      p.name as sku_name,
      COUNT(*) FILTER (WHERE fd.on_hand_units = 0)::numeric as metric_value,
      SUM(fd.units_sold) as units_sold,
      AVG(fd.on_hand_units) as avg_inventory
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND fd.d >= v_start_date
      AND fd.d <= v_end_date
    GROUP BY fd.sku, p.name
    HAVING COUNT(*) FILTER (WHERE fd.on_hand_units = 0) > 0
    ORDER BY metric_value DESC
    LIMIT p_limit;
    
  ELSIF p_metric = 'turns' THEN
    RETURN QUERY
    SELECT 
      fd.sku,
      p.name as sku_name,
      CASE 
        WHEN AVG(fd.on_hand_units * p.unit_cost) > 0 
        THEN (SUM(fd.units_sold * p.unit_cost) / AVG(fd.on_hand_units * p.unit_cost))
        ELSE 0 
      END as metric_value,
      SUM(fd.units_sold) as units_sold,
      AVG(fd.on_hand_units) as avg_inventory
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND fd.d >= v_start_date
      AND fd.d <= v_end_date
    GROUP BY fd.sku, p.name, p.unit_cost
    ORDER BY metric_value DESC
    LIMIT p_limit;
    
  ELSE
    RETURN QUERY
    SELECT 
      fd.sku,
      p.name as sku_name,
      SUM(fd.units_sold) as metric_value,
      SUM(fd.units_sold) as units_sold,
      AVG(fd.on_hand_units) as avg_inventory
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND fd.d >= v_start_date
      AND fd.d <= v_end_date
    GROUP BY fd.sku, p.name
    ORDER BY metric_value DESC
    LIMIT p_limit;
  END IF;
END;
$function$;

-- Fix get_inventory_zones_report
CREATE OR REPLACE FUNCTION public.get_inventory_zones_report(p_location_code text DEFAULT 'ALL', p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE(sku text, sku_name text, rolling_21d_sales numeric, rolling_21d_avg_daily numeric, avg_on_hand numeric, avg_target numeric, avg_economic numeric, avg_economic_overstock numeric, avg_weekly_sales numeric, stockout_days integer, total_days integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_start_date date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '90 days');
  v_end_date date := COALESCE(p_end_date, CURRENT_DATE);
  v_rolling_start_date date := v_end_date - INTERVAL '21 days';
BEGIN
  RETURN QUERY
  SELECT 
    fd.sku,
    p.name as sku_name,
    SUM(fd.units_sold) FILTER (WHERE fd.d > v_rolling_start_date) as rolling_21d_sales,
    AVG(fd.units_sold) FILTER (WHERE fd.d > v_rolling_start_date) as rolling_21d_avg_daily,
    AVG(fd.on_hand_units) as avg_on_hand,
    AVG(fd.target_units) as avg_target,
    AVG(fd.economic_units) as avg_economic,
    AVG(fd.economic_overstock_units) as avg_economic_overstock,
    AVG(fd.units_sold) * 7 as avg_weekly_sales,
    COUNT(*) FILTER (WHERE fd.on_hand_units = 0)::integer as stockout_days,
    COUNT(*)::integer as total_days
  FROM aifo.fact_daily fd
  JOIN aifo.products p ON fd.sku = p.sku
  WHERE 
    (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND fd.d >= v_start_date
    AND fd.d <= v_end_date
  GROUP BY fd.sku, p.name
  HAVING SUM(fd.units_sold) FILTER (WHERE fd.d > v_rolling_start_date) > 0
  ORDER BY rolling_21d_sales DESC;
END;
$function$;

-- Fix get_mtv_by_sku_style
CREATE OR REPLACE FUNCTION public.get_mtv_by_sku_style(p_location_code text DEFAULT 'ALL', p_style_length integer DEFAULT 5, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE(sku_style text, total_mtv numeric, sku_count integer, sample_skus text[])
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_start_date date := COALESCE(p_start_date, '2023-01-01'::date);
  v_end_date date := COALESCE(p_end_date, '2023-12-31'::date);
BEGIN
  RETURN QUERY
  WITH sku_mtv AS (
    SELECT 
      fd.sku,
      LEFT(fd.sku, p_style_length) as style,
      p.unit_price - p.unit_cost as margin,
      SUM(fd.units_sold) as total_units,
      COUNT(*) as total_days,
      COUNT(*) FILTER (WHERE fd.on_hand_units > 0) as available_days
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND fd.d >= v_start_date
      AND fd.d <= v_end_date
    GROUP BY fd.sku, LEFT(fd.sku, p_style_length), p.unit_price, p.unit_cost
  ),
  sku_calculations AS (
    SELECT
      sku,
      style,
      margin,
      total_units,
      (available_days::numeric / NULLIF(total_days, 0)::numeric) as service_level,
      (total_units * margin) as tcm
    FROM sku_mtv
  ),
  sku_mtv_calc AS (
    SELECT
      sku,
      style,
      CASE 
        WHEN service_level > 0 AND service_level < 1
        THEN (tcm / service_level) - tcm
        ELSE 0
      END as mtv
    FROM sku_calculations
  ),
  style_aggregates AS (
    SELECT 
      style,
      SUM(mtv) as total_mtv,
      COUNT(DISTINCT sku) as sku_count
    FROM sku_mtv_calc
    WHERE mtv > 0
    GROUP BY style
  ),
  sample_skus_cte AS (
    SELECT
      style,
      ARRAY_AGG(sku ORDER BY sku) as samples
    FROM (
      SELECT DISTINCT style, sku
      FROM sku_mtv_calc
      WHERE mtv > 0
    ) sub
    GROUP BY style
  )
  SELECT 
    sa.style as sku_style,
    sa.total_mtv,
    sa.sku_count::integer,
    ss.samples[1:5] as sample_skus
  FROM style_aggregates sa
  LEFT JOIN sample_skus_cte ss ON sa.style = ss.style
  ORDER BY sa.total_mtv DESC;
END;
$function$;

-- Fix get_kpi_data_aggregated
CREATE OR REPLACE FUNCTION public.get_kpi_data_aggregated(p_location_code text, p_sku text, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE(location_code text, sku text, days_total integer, sku_loc_days integer, tcm numeric, turns_current numeric, turns_sim numeric, mtv numeric, service_level numeric, service_level_sim numeric, missed_units numeric, riv numeric)
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

-- Fix calculate_riv
CREATE OR REPLACE FUNCTION public.calculate_riv(p_location_code text, p_sku text, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_avg_riv numeric := 0;
BEGIN
  WITH daily_riv AS (
    SELECT 
      fd.d,
      SUM(
        CASE 
          WHEN fd.economic_units > fd.target_units 
          THEN (fd.economic_units - fd.target_units) * p.unit_cost
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

-- Security Fix: Add explicit DELETE policy for aifo.fact_daily table
CREATE POLICY "Admins can delete fact_daily data"
ON aifo.fact_daily
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));