-- Create function to merge sales and inventory into fact_daily
CREATE OR REPLACE FUNCTION aifo.merge_sales_inventory_to_fact_daily(p_dataset_id uuid)
RETURNS TABLE(
  records_created integer,
  min_date date,
  max_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
DECLARE
  v_records_created integer;
  v_min_date date;
  v_max_date date;
BEGIN
  -- Merge sales and inventory into fact_daily using FULL OUTER JOIN
  INSERT INTO aifo.fact_daily (
    dataset_id, d, location_code, sku, 
    units_sold, on_hand_units, on_order_units, in_transit_units,
    on_hand_units_sim, target_units, economic_units, economic_overstock_units
  )
  SELECT 
    p_dataset_id,
    COALESCE(s.d, i.d) as d,
    COALESCE(s.location_code, i.location_code) as location_code,
    COALESCE(s.sku, i.sku) as sku,
    COALESCE(s.units_sold, 0) as units_sold,
    COALESCE(i.on_hand_units, 0) as on_hand_units,
    COALESCE(i.on_order_units, 0) as on_order_units,
    COALESCE(i.in_transit_units, 0) as in_transit_units,
    COALESCE(i.on_hand_units, 0) as on_hand_units_sim,
    NULL as target_units,
    NULL as economic_units,
    NULL as economic_overstock_units
  FROM aifo.sales s
  FULL OUTER JOIN aifo.inventory i 
    ON s.dataset_id = i.dataset_id 
    AND s.d = i.d 
    AND s.location_code = i.location_code 
    AND s.sku = i.sku
  WHERE s.dataset_id = p_dataset_id OR i.dataset_id = p_dataset_id
  ON CONFLICT (dataset_id, d, location_code, sku) 
  DO UPDATE SET
    units_sold = EXCLUDED.units_sold,
    on_hand_units = EXCLUDED.on_hand_units,
    on_order_units = EXCLUDED.on_order_units,
    in_transit_units = EXCLUDED.in_transit_units,
    on_hand_units_sim = EXCLUDED.on_hand_units_sim;

  GET DIAGNOSTICS v_records_created = ROW_COUNT;

  -- Calculate date range where we have BOTH sales AND inventory
  SELECT 
    MIN(fd.d),
    MAX(fd.d)
  INTO v_min_date, v_max_date
  FROM aifo.fact_daily fd
  WHERE fd.dataset_id = p_dataset_id
    AND fd.units_sold > 0
    AND fd.on_hand_units >= 0;

  RETURN QUERY SELECT v_records_created, v_min_date, v_max_date;
END;
$$;