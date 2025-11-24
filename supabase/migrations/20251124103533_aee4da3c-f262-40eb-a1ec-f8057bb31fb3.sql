-- Update batch update function to include simulated on-hand units
CREATE OR REPLACE FUNCTION public.update_fact_daily_batch(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  UPDATE aifo.fact_daily
  SET
    on_hand_units_sim = (u->>'on_hand_units_sim')::numeric,
    target_units = (u->>'target_units')::numeric,
    economic_units = (u->>'economic_units')::numeric,
    economic_overstock_units = (u->>'economic_overstock_units')::numeric
  FROM jsonb_array_elements(updates) AS u
  WHERE 
    fact_daily.location_code = u->>'location_code'
    AND fact_daily.sku = u->>'sku'
    AND fact_daily.d = (u->>'d')::date;
END;
$function$;