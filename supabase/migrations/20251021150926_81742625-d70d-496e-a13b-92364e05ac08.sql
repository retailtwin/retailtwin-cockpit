-- Update get_kpi_data to include sku_loc_days field for consistency
DROP FUNCTION IF EXISTS public.get_kpi_data(text, text);

CREATE OR REPLACE FUNCTION public.get_kpi_data(p_location_code text, p_sku text)
RETURNS TABLE(
  location_code text, 
  sku text, 
  days_total integer, 
  sku_loc_days integer,
  tcm numeric, 
  turns_current numeric, 
  turns_sim numeric, 
  mtv numeric, 
  service_level numeric, 
  service_level_sim numeric, 
  missed_units numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
  SELECT 
    location_code, 
    sku, 
    days_total,
    days_total as sku_loc_days,
    tcm,
    turns_current,
    turns_sim,
    mtv,
    service_level,
    service_level as service_level_sim,
    missed_units
  FROM aifo.kpi_current 
  WHERE location_code = p_location_code 
    AND sku = p_sku;
$function$;