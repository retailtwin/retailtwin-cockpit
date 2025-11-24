-- Drop the existing function with the inefficient filter
DROP FUNCTION IF EXISTS public.get_fact_daily_raw(text, text, text, text);

-- Recreate the function WITHOUT the inefficient EXISTS filter
-- The edge function will handle zero-sales filtering in JavaScript for better performance
CREATE OR REPLACE FUNCTION public.get_fact_daily_raw(
  p_location_code text, 
  p_sku text, 
  p_start_date text, 
  p_end_date text
)
RETURNS TABLE(
  d date,
  location_code text,
  sku text,
  units_sold numeric,
  on_hand_units numeric,
  on_order_units integer,
  in_transit_units integer,
  on_hand_units_sim numeric,
  target_units numeric,
  economic_units numeric,
  economic_overstock_units numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
  SELECT 
    fd.d,
    fd.location_code,
    fd.sku,
    fd.units_sold,
    fd.on_hand_units,
    fd.on_order_units,
    fd.in_transit_units,
    fd.on_hand_units_sim,
    fd.target_units,
    fd.economic_units,
    fd.economic_overstock_units
  FROM aifo.fact_daily fd
  WHERE 
    (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku = p_sku)
    AND fd.d >= p_start_date::date
    AND fd.d <= p_end_date::date
  ORDER BY fd.d;
$function$;

-- Create composite index to dramatically speed up the query
-- This index optimizes the WHERE clause and ORDER BY
CREATE INDEX IF NOT EXISTS idx_fact_daily_location_sku_date 
ON aifo.fact_daily(location_code, sku, d);