-- Drop all existing versions of get_fact_daily_raw to resolve overloading conflict
DROP FUNCTION IF EXISTS public.get_fact_daily_raw(text, text, date, date);
DROP FUNCTION IF EXISTS public.get_fact_daily_raw(text, text, text, text);

-- Recreate the function with TEXT date parameters and zero-sales filter
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
    -- Filter out SKU-locations with zero total sales in the date range
    AND EXISTS (
      SELECT 1
      FROM aifo.fact_daily fd2
      WHERE fd2.location_code = fd.location_code
        AND fd2.sku = fd.sku
        AND fd2.d >= p_start_date::date
        AND fd2.d <= p_end_date::date
      GROUP BY fd2.location_code, fd2.sku
      HAVING SUM(fd2.units_sold) > 0
    )
  ORDER BY fd.d;
$function$;