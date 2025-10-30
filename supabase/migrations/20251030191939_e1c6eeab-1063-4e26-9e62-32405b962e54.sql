-- Create function to get MTV aggregated by SKU style (first N digits)
CREATE OR REPLACE FUNCTION public.get_mtv_by_sku_style(
  p_location_code text DEFAULT 'ALL',
  p_style_length integer DEFAULT 5,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  sku_style text,
  total_mtv numeric,
  sku_count integer,
  sample_skus text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
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
$$;