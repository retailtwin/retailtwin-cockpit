-- Migration: Fix get_fact_daily_raw() to implement Option C date filtering
-- Purpose: Returns continuous time series between first and last valid days per SKU-location
-- Valid day = has both sales (units_sold > 0) AND inventory (units_on_hand > 0)

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
    -- Find first and last valid day per SKU-location
    -- Valid = has both sales > 0 AND inventory > 0
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

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.get_fact_daily_raw(text, text, date, date) TO anon, authenticated, service_role;

-- Migration: Fix update_fact_daily_batch() with type casts and debug logging

CREATE OR REPLACE FUNCTION public.update_fact_daily_batch(updates jsonb)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  update_record jsonb;
  rows_updated integer;
BEGIN
  FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE public.fact_daily
    SET 
      on_hand_units_sim = (update_record->>'on_hand_units_sim')::numeric,
      target_units = (update_record->>'target_units')::numeric,
      economic_units = (update_record->>'economic_units')::numeric,
      economic_overstock_units = (update_record->>'economic_overstock_units')::numeric
    WHERE location_code::text = (update_record->>'location_code')
      AND sku::text = (update_record->>'sku')
      AND day = (update_record->>'d')::date;
      
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    IF rows_updated = 0 THEN
      RAISE WARNING 'No rows updated for location_code=%, sku=%, d=%', 
        update_record->>'location_code', 
        update_record->>'sku', 
        update_record->>'d';
    END IF;
  END LOOP;
END;
$function$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.update_fact_daily_batch(jsonb) TO anon, authenticated, service_role;