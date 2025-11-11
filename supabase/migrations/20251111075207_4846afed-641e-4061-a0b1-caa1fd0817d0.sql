-- Security Fix: Add search_path to remaining SQL functions

-- Fix get_fact_daily_raw
CREATE OR REPLACE FUNCTION public.get_fact_daily_raw(p_location_code text, p_sku text, p_start_date date, p_end_date date)
RETURNS TABLE(d date, location_code text, sku text, units_sold numeric, on_hand_units numeric, on_order_units integer, in_transit_units integer, on_hand_units_sim numeric, target_units numeric, economic_units numeric, economic_overstock_units numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
  SELECT 
    d,
    location_code,
    sku,
    units_sold,
    on_hand_units,
    on_order_units,
    in_transit_units,
    on_hand_units_sim,
    target_units,
    economic_units,
    economic_overstock_units
  FROM aifo.fact_daily
  WHERE 
    (p_location_code = 'ALL' OR location_code = p_location_code)
    AND (p_sku = 'ALL' OR sku = p_sku)
    AND d >= p_start_date
    AND d <= p_end_date
  ORDER BY d;
$function$;

-- Fix get_fact_daily_aggregated
CREATE OR REPLACE FUNCTION public.get_fact_daily_aggregated(p_location_code text, p_sku text, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE(d date, location_code text, sku text, units_sold numeric, on_hand_units numeric, on_hand_units_sim numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
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
    AND (p_start_date IS NULL OR d >= p_start_date)
    AND (p_end_date IS NULL OR d <= p_end_date)
  GROUP BY d
  ORDER BY d;
$function$;

-- Fix get_locations
CREATE OR REPLACE FUNCTION public.get_locations()
RETURNS TABLE(code text, name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
  SELECT code, name FROM aifo.locations ORDER BY name;
$function$;

-- Fix get_products
CREATE OR REPLACE FUNCTION public.get_products()
RETURNS TABLE(sku text, name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
  SELECT sku, name FROM aifo.products ORDER BY name;
$function$;