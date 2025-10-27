-- Fix ambiguous column reference in get_pareto_analysis function
CREATE OR REPLACE FUNCTION public.get_pareto_analysis(
  p_location_code text,
  p_sku text DEFAULT 'ALL'::text,
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
    rs.sku,
    rs.sku_name,
    rs.total_units,
    rs.cumulative,
    (rs.cumulative / NULLIF(rs.grand_total, 0) * 100)::numeric as cumulative_percent,
    rs.sku_rank::integer,
    rs.total_count::integer,
    (p_sku != 'ALL' AND rs.sku = p_sku) as is_selected_sku,
    rs.availability_pct
  FROM ranked_skus rs
  ORDER BY rs.sku_rank;
END;
$$;