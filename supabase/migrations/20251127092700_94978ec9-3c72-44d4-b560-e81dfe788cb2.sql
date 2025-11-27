-- First, drop ALL existing versions of the function to avoid signature conflicts
DROP FUNCTION IF EXISTS public.get_fact_daily_raw(text, text, date, date);
DROP FUNCTION IF EXISTS public.get_fact_daily_raw(text, text, text, text);

-- Now create the single correct version with DATE parameters
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
  WITH valid_bounds AS (
    SELECT 
      fd.location_code::text as loc,
      fd.sku::text as sk,
      MIN(fd.day) as first_valid_day,
      MAX(fd.day) as last_valid_day
    FROM public.fact_daily fd
    WHERE (p_location_code = 'ALL' OR fd.location_code::text = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku::text = p_sku)
      AND fd.day >= p_start_date
      AND fd.day <= p_end_date
      AND fd.units_sold > 0
      AND fd.units_on_hand > 0
    GROUP BY fd.location_code::text, fd.sku::text
  )
  SELECT 
    fd.location_code::text,
    fd.sku::text,
    fd.day as d,
    COALESCE(fd.units_sold, 0) as units_sold,
    COALESCE(fd.units_on_hand, 0) as on_hand_units,
    COALESCE(fd.units_on_order, 0) as on_order_units,
    COALESCE(fd.units_in_transit, 0) as in_transit_units
  FROM public.fact_daily fd
  INNER JOIN valid_bounds vb 
    ON fd.location_code::text = vb.loc 
    AND fd.sku::text = vb.sk
  WHERE (p_location_code = 'ALL' OR fd.location_code::text = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku::text = p_sku)
    AND fd.day >= vb.first_valid_day
    AND fd.day <= vb.last_valid_day
  ORDER BY fd.location_code, fd.sku, fd.day;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_fact_daily_raw(text, text, date, date) TO anon, authenticated, service_role;