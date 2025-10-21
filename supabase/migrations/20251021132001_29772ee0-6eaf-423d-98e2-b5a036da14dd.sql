-- Create a function to insert fact_daily records in batch
CREATE OR REPLACE FUNCTION public.insert_fact_daily_batch(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
BEGIN
  INSERT INTO aifo.fact_daily (d, location_code, sku, units_sold, on_hand_units, on_order_units, in_transit_units, on_hand_units_sim)
  SELECT 
    (r->>'d')::date,
    r->>'location_code',
    r->>'sku',
    (r->>'units_sold')::numeric,
    CASE WHEN r->>'on_hand_units' = '' THEN NULL ELSE (r->>'on_hand_units')::numeric END,
    COALESCE((r->>'on_order_units')::integer, 0),
    COALESCE((r->>'in_transit_units')::integer, 0),
    CASE WHEN r->>'on_hand_units_sim' = '' THEN NULL ELSE (r->>'on_hand_units_sim')::numeric END
  FROM jsonb_array_elements(records) AS r;
END;
$$;