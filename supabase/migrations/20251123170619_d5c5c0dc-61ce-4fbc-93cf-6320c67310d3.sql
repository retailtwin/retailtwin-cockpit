-- Make datasets completely independent by including dataset_id in unique constraints

-- Drop existing unique constraints and add new ones with dataset_id for aifo.locations
ALTER TABLE aifo.locations DROP CONSTRAINT IF EXISTS locations_code_key;
ALTER TABLE aifo.locations DROP CONSTRAINT IF EXISTS locations_dataset_id_code_key;
ALTER TABLE aifo.locations ADD CONSTRAINT locations_dataset_id_code_key UNIQUE (dataset_id, code);

-- Drop existing unique constraints and add new ones with dataset_id for aifo.products
ALTER TABLE aifo.products DROP CONSTRAINT IF EXISTS products_sku_key;
ALTER TABLE aifo.products DROP CONSTRAINT IF EXISTS products_dataset_id_sku_key;
ALTER TABLE aifo.products ADD CONSTRAINT products_dataset_id_sku_key UNIQUE (dataset_id, sku);

-- Drop existing unique constraints and add new ones with dataset_id for aifo.fact_daily
ALTER TABLE aifo.fact_daily DROP CONSTRAINT IF EXISTS fact_daily_location_code_sku_d_key;
ALTER TABLE aifo.fact_daily DROP CONSTRAINT IF EXISTS fact_daily_dataset_id_location_code_sku_d_key;
ALTER TABLE aifo.fact_daily ADD CONSTRAINT fact_daily_dataset_id_location_code_sku_d_key UNIQUE (dataset_id, location_code, sku, d);

-- Update upsert_locations_for_dataset function to use dataset_id in conflict
CREATE OR REPLACE FUNCTION public.upsert_locations_for_dataset(p_dataset_id uuid, records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.locations (
    dataset_id, code, name, production_lead_time, shipping_lead_time, order_days
  )
  SELECT 
    p_dataset_id,
    r->>'store_code',
    r->>'name',
    COALESCE((r->>'production_lead_time')::integer, 0),
    COALESCE((r->>'shipping_lead_time')::integer, 0),
    COALESCE(r->>'order_days', 'mon,tue,wed,thu,fri,sat,sun')
  FROM jsonb_array_elements(records) AS r
  ON CONFLICT (dataset_id, code) 
  DO UPDATE SET
    name = EXCLUDED.name,
    production_lead_time = EXCLUDED.production_lead_time,
    shipping_lead_time = EXCLUDED.shipping_lead_time,
    order_days = EXCLUDED.order_days;
END;
$function$;

-- Update upsert_products_for_dataset function to use dataset_id in conflict
CREATE OR REPLACE FUNCTION public.upsert_products_for_dataset(p_dataset_id uuid, records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.products (
    dataset_id, sku, name, unit_cost, unit_price, target_max_units,
    pack_size, minimum_order_quantity, group_1, group_2, group_3
  )
  SELECT 
    p_dataset_id,
    r->>'product_code',
    r->>'name',
    (r->>'cost_price')::numeric,
    (r->>'sales_price')::numeric,
    COALESCE((r->>'target_max_units')::numeric, 0),
    COALESCE((r->>'pack_size')::integer, 1),
    COALESCE((r->>'minimum_order_quantity')::integer, 1),
    r->>'group_1',
    r->>'group_2',
    r->>'group_3'
  FROM jsonb_array_elements(records) AS r
  ON CONFLICT (dataset_id, sku) 
  DO UPDATE SET
    name = EXCLUDED.name,
    unit_cost = EXCLUDED.unit_cost,
    unit_price = EXCLUDED.unit_price,
    target_max_units = EXCLUDED.target_max_units,
    pack_size = EXCLUDED.pack_size,
    minimum_order_quantity = EXCLUDED.minimum_order_quantity,
    group_1 = EXCLUDED.group_1,
    group_2 = EXCLUDED.group_2,
    group_3 = EXCLUDED.group_3;
END;
$function$;

-- Update upsert_inventory_for_dataset function to use dataset_id in conflict
CREATE OR REPLACE FUNCTION public.upsert_inventory_for_dataset(p_dataset_id uuid, records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.fact_daily (
    dataset_id, d, location_code, sku, units_sold, 
    on_hand_units, on_order_units, in_transit_units,
    on_hand_units_sim, target_units, economic_units, economic_overstock_units
  )
  SELECT 
    p_dataset_id,
    (r->>'day')::date,
    r->>'store',
    r->>'product',
    COALESCE((r->>'units_sold')::numeric, 0),
    COALESCE((r->>'units_on_hand')::numeric, 0),
    COALESCE((r->>'units_on_order')::integer, 0),
    COALESCE((r->>'units_in_transit')::integer, 0),
    NULL, NULL, NULL, NULL
  FROM jsonb_array_elements(records) AS r
  ON CONFLICT (dataset_id, location_code, sku, d) 
  DO UPDATE SET
    on_hand_units = EXCLUDED.on_hand_units,
    on_order_units = EXCLUDED.on_order_units,
    in_transit_units = EXCLUDED.in_transit_units;
END;
$function$;

-- Update insert_sales_for_dataset function to use dataset_id in conflict
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
  ON CONFLICT (dataset_id, location_code, sku, d)
  DO UPDATE SET
    units_sold = EXCLUDED.units_sold,
    on_hand_units = COALESCE(EXCLUDED.on_hand_units, aifo.fact_daily.on_hand_units),
    dataset_id = EXCLUDED.dataset_id;
END;
$function$;