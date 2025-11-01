-- Update get_inventory_zones_report to use rolling 21-day sales rate
DROP FUNCTION IF EXISTS public.get_inventory_zones_report(text, date, date);

CREATE OR REPLACE FUNCTION public.get_inventory_zones_report(
  p_location_code text DEFAULT 'ALL'::text, 
  p_start_date date DEFAULT NULL::date, 
  p_end_date date DEFAULT NULL::date
)
RETURNS TABLE(
  sku text, 
  sku_name text, 
  rolling_21d_sales numeric,
  rolling_21d_avg_daily numeric,
  avg_on_hand numeric, 
  avg_target numeric, 
  avg_economic numeric, 
  avg_economic_overstock numeric, 
  avg_weekly_sales numeric, 
  stockout_days integer, 
  total_days integer
)
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