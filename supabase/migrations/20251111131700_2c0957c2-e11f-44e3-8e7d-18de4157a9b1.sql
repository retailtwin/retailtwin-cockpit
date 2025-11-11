-- Create function to get actual data date range
CREATE OR REPLACE FUNCTION public.get_data_date_range()
RETURNS TABLE(min_date date, max_date date)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
  SELECT 
    MIN(d) as min_date,
    MAX(d) as max_date
  FROM aifo.fact_daily;
$$;

-- Update get_top_skus_by_metric to support MTV metric and auto-fill dates
CREATE OR REPLACE FUNCTION public.get_top_skus_by_metric(
  p_location_code text, 
  p_metric text, 
  p_limit integer DEFAULT 10, 
  p_start_date date DEFAULT NULL::date, 
  p_end_date date DEFAULT NULL::date
)
RETURNS TABLE(
  sku text, 
  sku_name text, 
  metric_value numeric, 
  units_sold numeric, 
  avg_inventory numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_start_date date := COALESCE(p_start_date, (SELECT MIN(d) FROM aifo.fact_daily));
  v_end_date date := COALESCE(p_end_date, (SELECT MAX(d) FROM aifo.fact_daily));
BEGIN
  IF p_metric = 'mtv' THEN
    RETURN QUERY
    WITH sku_mtv AS (
      SELECT 
        fd.sku,
        p.name as sku_name,
        p.unit_price - p.unit_cost as margin,
        SUM(fd.units_sold) as total_units,
        COUNT(*) as total_days,
        COUNT(*) FILTER (WHERE fd.on_hand_units > 0) as available_days,
        AVG(fd.on_hand_units) as avg_inventory
      FROM aifo.fact_daily fd
      JOIN aifo.products p ON fd.sku = p.sku
      WHERE 
        (p_location_code = 'ALL' OR fd.location_code = p_location_code)
        AND fd.d >= v_start_date
        AND fd.d <= v_end_date
      GROUP BY fd.sku, p.name, p.unit_price, p.unit_cost
    )
    SELECT
      sku,
      sku_name,
      CASE 
        WHEN available_days::numeric / NULLIF(total_days, 0)::numeric BETWEEN 0.01 AND 0.99
        THEN ((total_units * margin) / (available_days::numeric / total_days::numeric)) - (total_units * margin)
        ELSE 0
      END as metric_value,
      total_units as units_sold,
      avg_inventory
    FROM sku_mtv
    WHERE available_days::numeric / NULLIF(total_days, 0)::numeric < 1
    ORDER BY metric_value DESC
    LIMIT p_limit;
    
  ELSIF p_metric = 'sales' THEN
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