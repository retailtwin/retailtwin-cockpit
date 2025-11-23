-- Create dataset-aware batch upsert functions for aifo schema

-- Function for upserting locations with dataset_id
CREATE OR REPLACE FUNCTION public.upsert_locations_for_dataset(records jsonb, p_dataset_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.locations (
    code, name, production_lead_time, shipping_lead_time, order_days, dataset_id
  )
  SELECT 
    r->>'store_code',
    r->>'name',
    COALESCE((r->>'production_lead_time')::integer, 0),
    COALESCE((r->>'shipping_lead_time')::integer, 0),
    COALESCE(r->>'order_days', 'mon,tue,wed,thu,fri,sat,sun'),
    p_dataset_id
  FROM jsonb_array_elements(records) AS r
  ON CONFLICT (code, dataset_id) 
  DO UPDATE SET
    name = EXCLUDED.name,
    production_lead_time = EXCLUDED.production_lead_time,
    shipping_lead_time = EXCLUDED.shipping_lead_time,
    order_days = EXCLUDED.order_days;
END;
$function$;

-- Function for upserting products with dataset_id
CREATE OR REPLACE FUNCTION public.upsert_products_for_dataset(records jsonb, p_dataset_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.products (
    sku, name, unit_cost, unit_price, pack_size, minimum_order_quantity, 
    group_1, group_2, group_3, dataset_id
  )
  SELECT 
    r->>'product_code',
    r->>'name',
    COALESCE((r->>'cost_price')::numeric, 0),
    COALESCE((r->>'sales_price')::numeric, 0),
    COALESCE((r->>'pack_size')::integer, 1),
    COALESCE((r->>'minimum_order_quantity')::integer, 1),
    r->>'group_1',
    r->>'group_2',
    r->>'group_3',
    p_dataset_id
  FROM jsonb_array_elements(records) AS r
  ON CONFLICT (sku, dataset_id) 
  DO UPDATE SET
    name = EXCLUDED.name,
    unit_cost = EXCLUDED.unit_cost,
    unit_price = EXCLUDED.unit_price,
    pack_size = EXCLUDED.pack_size,
    minimum_order_quantity = EXCLUDED.minimum_order_quantity,
    group_1 = EXCLUDED.group_1,
    group_2 = EXCLUDED.group_2,
    group_3 = EXCLUDED.group_3;
END;
$function$;

-- Function for inserting sales records with dataset_id
CREATE OR REPLACE FUNCTION public.insert_sales_for_dataset(records jsonb, p_dataset_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.fact_daily (
    d, location_code, sku, units_sold, on_hand_units, dataset_id
  )
  SELECT 
    COALESCE((r->>'day')::date, (r->>'d')::date),
    COALESCE(r->>'store', r->>'location_code'),
    COALESCE(r->>'product', r->>'sku'),
    COALESCE((r->>'units')::numeric, (r->>'units_sold')::numeric, 0),
    CASE WHEN r->>'on_hand_units' = '' OR r->>'on_hand_units' IS NULL 
         THEN NULL 
         ELSE (r->>'on_hand_units')::numeric 
    END,
    p_dataset_id
  FROM jsonb_array_elements(records) AS r;
END;
$function$;

-- Function for upserting inventory records with dataset_id
CREATE OR REPLACE FUNCTION public.upsert_inventory_for_dataset(records jsonb, p_dataset_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.fact_daily (
    d, location_code, sku, on_hand_units, on_order_units, in_transit_units, dataset_id
  )
  SELECT 
    (r->>'day')::date,
    r->>'store',
    r->>'product',
    COALESCE((r->>'units_on_hand')::numeric, 0),
    COALESCE((r->>'units_on_order')::integer, 0),
    COALESCE((r->>'units_in_transit')::integer, 0),
    p_dataset_id
  FROM jsonb_array_elements(records) AS r
  ON CONFLICT (location_code, sku, d, dataset_id) 
  DO UPDATE SET
    on_hand_units = EXCLUDED.on_hand_units,
    on_order_units = EXCLUDED.on_order_units,
    in_transit_units = EXCLUDED.in_transit_units;
END;
$function$;