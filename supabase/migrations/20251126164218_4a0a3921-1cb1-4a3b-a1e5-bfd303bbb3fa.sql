-- Create function to batch update fact_daily simulation results
CREATE OR REPLACE FUNCTION public.update_fact_daily_batch(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
BEGIN
  -- Update each record in the batch
  UPDATE aifo.fact_daily fd
  SET
    on_hand_units_sim = (u.value->>'on_hand_units_sim')::numeric,
    target_units = (u.value->>'target_units')::numeric,
    economic_units = (u.value->>'economic_units')::numeric,
    economic_overstock_units = (u.value->>'economic_overstock_units')::numeric
  FROM jsonb_array_elements(updates) AS u
  WHERE fd.location_code = (u.value->>'location_code')::text
    AND fd.sku = (u.value->>'sku')::text
    AND fd.d = (u.value->>'d')::date;
END;
$$;