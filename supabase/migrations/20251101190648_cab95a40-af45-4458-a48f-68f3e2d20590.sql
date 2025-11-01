-- Create RPC function to get raw fact_daily data
CREATE OR REPLACE FUNCTION public.get_fact_daily_raw(
  p_location_code text,
  p_sku text,
  p_start_date date,
  p_end_date date
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
AS $$
  SELECT 
    d,
    location_code,
    sku,
    units_sold,
    on_hand_units,
    on_order_units,
    in_transit_units,
    on_hand_units_sim,
    target_units,
    economic_units,
    economic_overstock_units
  FROM aifo.fact_daily
  WHERE 
    (p_location_code = 'ALL' OR location_code = p_location_code)
    AND (p_sku = 'ALL' OR sku = p_sku)
    AND d >= p_start_date
    AND d <= p_end_date
  ORDER BY d;
$$;

-- Create RPC function to update fact_daily data
CREATE OR REPLACE FUNCTION public.update_fact_daily_batch(
  updates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
BEGIN
  UPDATE aifo.fact_daily
  SET
    target_units = (u->>'target_units')::numeric,
    economic_units = (u->>'economic_units')::numeric,
    economic_overstock_units = (u->>'economic_overstock_units')::numeric
  FROM jsonb_array_elements(updates) AS u
  WHERE 
    fact_daily.location_code = u->>'location_code'
    AND fact_daily.sku = u->>'sku'
    AND fact_daily.d = (u->>'d')::date;
END;
$$;