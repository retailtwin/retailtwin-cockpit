-- Fix insert_sales_for_dataset to handle duplicates with UPSERT
CREATE OR REPLACE FUNCTION public.insert_sales_for_dataset(p_dataset_id uuid, records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.fact_daily (
    dataset_id, d, location_code, sku, units_sold, on_hand_units, 
    on_order_units, in_transit_units, on_hand_units_sim, 
    target_units, economic_units, economic_overstock_units
  )
  SELECT 
    p_dataset_id,
    (r->>'d')::date,
    r->>'location_code',
    r->>'sku',
    (r->>'units_sold')::numeric,
    CASE WHEN r->>'on_hand_units' = '' THEN NULL ELSE (r->>'on_hand_units')::numeric END,
    COALESCE((r->>'on_order_units')::integer, 0),
    COALESCE((r->>'in_transit_units')::integer, 0),
    CASE WHEN r->>'on_hand_units_sim' = '' THEN NULL ELSE (r->>'on_hand_units_sim')::numeric END,
    CASE WHEN r->>'target_units' = '' THEN NULL ELSE (r->>'target_units')::numeric END,
    CASE WHEN r->>'economic_units' = '' THEN NULL ELSE (r->>'economic_units')::numeric END,
    CASE WHEN r->>'economic_overstock_units' = '' THEN NULL ELSE (r->>'economic_overstock_units')::numeric END
  FROM jsonb_array_elements(records) AS r
  ON CONFLICT (location_code, sku, d)
  DO UPDATE SET
    units_sold = EXCLUDED.units_sold,
    on_hand_units = COALESCE(EXCLUDED.on_hand_units, aifo.fact_daily.on_hand_units),
    dataset_id = EXCLUDED.dataset_id;
END;
$function$;