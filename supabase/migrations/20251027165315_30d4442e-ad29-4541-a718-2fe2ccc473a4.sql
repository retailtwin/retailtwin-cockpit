-- Create function for Pareto analysis
CREATE OR REPLACE FUNCTION public.get_pareto_analysis(
  p_location_code text,
  p_sku text DEFAULT 'ALL',
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  sku text,
  sku_name text,
  total_units_sold numeric,
  cumulative_units numeric,
  cumulative_percent numeric,
  rank integer,
  total_skus integer,
  is_selected_sku boolean,
  availability_percent numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
BEGIN
  RETURN QUERY
  WITH sku_sales AS (
    SELECT 
      fd.sku,
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
      sku,
      sku_name,
      total_units,
      availability_pct,
      ROW_NUMBER() OVER (ORDER BY total_units DESC) as sku_rank,
      SUM(total_units) OVER (ORDER BY total_units DESC) as cumulative,
      SUM(total_units) OVER () as grand_total,
      COUNT(*) OVER () as total_count
    FROM sku_sales
  )
  SELECT 
    sku,
    sku_name,
    total_units,
    cumulative,
    (cumulative / NULLIF(grand_total, 0) * 100)::numeric as cumulative_percent,
    sku_rank::integer,
    total_count::integer,
    (p_sku != 'ALL' AND sku = p_sku) as is_selected_sku,
    availability_pct
  FROM ranked_skus
  ORDER BY sku_rank;
END;
$$;

-- Create function for SKU details
CREATE OR REPLACE FUNCTION public.get_sku_details(
  p_location_code text,
  p_sku text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  sku text,
  sku_name text,
  total_units_sold numeric,
  avg_daily_sales numeric,
  stockout_days integer,
  avg_on_hand numeric,
  max_on_hand numeric,
  min_on_hand numeric,
  days_with_data integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
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
$$;

-- Create function for top SKUs by metric
CREATE OR REPLACE FUNCTION public.get_top_skus_by_metric(
  p_location_code text,
  p_metric text,
  p_limit integer DEFAULT 10,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
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
AS $$
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
    -- Default to sales if metric not recognized
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
$$;