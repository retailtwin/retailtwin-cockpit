-- Fix get_fact_daily_raw to return ALL days without filtering
-- The DBM engine processes every day sequentially, carrying state forward

DROP FUNCTION IF EXISTS public.get_fact_daily_raw(text, text, date, date);

CREATE OR REPLACE FUNCTION public.get_fact_daily_raw(
  p_location_code text, 
  p_sku text, 
  p_start_date date, 
  p_end_date date
)
RETURNS TABLE(
  location_code text, 
  sku text, 
  d date, 
  units_sold numeric, 
  on_hand_units numeric, 
  on_order_units numeric, 
  in_transit_units numeric
)
LANGUAGE sql
STABLE
AS $function$
  -- Return ALL days in the range for each SKU-location
  -- The DBM engine will process every day sequentially
  SELECT 
    fd.location_code::text,
    fd.sku::text,
    fd.day as d,
    COALESCE(fd.units_sold, 0) as units_sold,
    COALESCE(fd.units_on_hand, 0) as on_hand_units,
    COALESCE(fd.units_on_order, 0) as on_order_units,
    COALESCE(fd.units_in_transit, 0) as in_transit_units
  FROM public.fact_daily fd
  WHERE (p_location_code = 'ALL' OR fd.location_code::text = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku::text = p_sku)
    AND fd.day >= p_start_date
    AND fd.day <= p_end_date
  ORDER BY fd.location_code, fd.sku, fd.day;
$function$;

GRANT EXECUTE ON FUNCTION public.get_fact_daily_raw(text, text, date, date) TO anon, authenticated, service_role;