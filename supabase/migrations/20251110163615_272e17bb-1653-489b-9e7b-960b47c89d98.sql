-- Add missing columns to aifo.products table
ALTER TABLE aifo.products 
ADD COLUMN IF NOT EXISTS pack_size INTEGER,
ADD COLUMN IF NOT EXISTS minimum_order_quantity INTEGER,
ADD COLUMN IF NOT EXISTS group_1 TEXT,
ADD COLUMN IF NOT EXISTS group_2 TEXT,
ADD COLUMN IF NOT EXISTS group_3 TEXT;

-- Create batch UPSERT function for locations
CREATE OR REPLACE FUNCTION public.upsert_locations_batch(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.locations (
    code, name, production_lead_time, shipping_lead_time, order_days
  )
  SELECT 
    r->>'store_code',
    r->>'name',
    COALESCE((r->>'production_lead_time')::integer, 0),
    COALESCE((r->>'shipping_lead_time')::integer, 0),
    COALESCE(r->>'order_days', 'mon,tue,wed,thu,fri,sat,sun')
  FROM jsonb_array_elements(records) AS r
  ON CONFLICT (code) 
  DO UPDATE SET
    name = EXCLUDED.name,
    production_lead_time = EXCLUDED.production_lead_time,
    shipping_lead_time = EXCLUDED.shipping_lead_time,
    order_days = EXCLUDED.order_days;
END;
$function$;

-- Create batch UPSERT function for products
CREATE OR REPLACE FUNCTION public.upsert_products_batch(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.products (
    sku, name, unit_cost, unit_price, target_max_units,
    pack_size, minimum_order_quantity, group_1, group_2, group_3
  )
  SELECT 
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
  ON CONFLICT (sku) 
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

-- Create batch UPSERT function for inventory (updates only on_hand, on_order, in_transit)
CREATE OR REPLACE FUNCTION public.upsert_inventory_batch(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.fact_daily (
    d, location_code, sku, units_sold, 
    on_hand_units, on_order_units, in_transit_units,
    on_hand_units_sim, target_units, economic_units, economic_overstock_units
  )
  SELECT 
    (r->>'day')::date,
    r->>'store',
    r->>'product',
    COALESCE((r->>'units_sold')::numeric, 0),
    COALESCE((r->>'units_on_hand')::numeric, 0),
    COALESCE((r->>'units_on_order')::integer, 0),
    COALESCE((r->>'units_in_transit')::integer, 0),
    NULL, NULL, NULL, NULL
  FROM jsonb_array_elements(records) AS r
  ON CONFLICT (location_code, sku, d) 
  DO UPDATE SET
    on_hand_units = EXCLUDED.on_hand_units,
    on_order_units = EXCLUDED.on_order_units,
    in_transit_units = EXCLUDED.in_transit_units;
END;
$function$;