-- Fix upsert_inventory_for_dataset to include units_sold = 0

CREATE OR REPLACE FUNCTION public.upsert_inventory_for_dataset(records jsonb, p_dataset_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.fact_daily (
    d, location_code, sku, units_sold, on_hand_units, on_order_units, in_transit_units, dataset_id
  )
  SELECT 
    (r->>'day')::date,
    r->>'store',
    r->>'product',
    0,  -- Set units_sold to 0 for inventory-only records
    COALESCE((r->>'units_on_hand')::numeric, 0),
    COALESCE((r->>'units_on_order')::integer, 0),
    COALESCE((r->>'units_in_transit')::integer, 0),
    p_dataset_id
  FROM jsonb_array_elements(records) AS r
  ON CONFLICT (location_code, sku, d) 
  DO UPDATE SET
    on_hand_units   = EXCLUDED.on_hand_units,
    on_order_units  = EXCLUDED.on_order_units,
    in_transit_units= EXCLUDED.in_transit_units,
    dataset_id      = EXCLUDED.dataset_id;
    -- Note: units_sold is NOT updated on conflict, preserving sales data
END;
$function$;