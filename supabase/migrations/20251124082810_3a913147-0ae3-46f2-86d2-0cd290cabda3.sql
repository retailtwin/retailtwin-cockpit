-- Phase 1: Remove dataset_id columns from aifo schema tables
ALTER TABLE aifo.locations DROP COLUMN IF EXISTS dataset_id;
ALTER TABLE aifo.products DROP COLUMN IF EXISTS dataset_id;
ALTER TABLE aifo.fact_daily DROP COLUMN IF EXISTS dataset_id;
ALTER TABLE dbm_calculations DROP COLUMN IF EXISTS dataset_id;

-- Phase 2: Update RPC functions to remove dataset_id parameters

-- Replace get_locations
CREATE OR REPLACE FUNCTION public.get_locations()
RETURNS TABLE(code text, name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
  SELECT DISTINCT l.code, l.name
  FROM aifo.locations l
  ORDER BY l.code;
$function$;

-- Replace get_products
CREATE OR REPLACE FUNCTION public.get_products()
RETURNS TABLE(sku text, name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
  SELECT DISTINCT p.sku, p.name
  FROM aifo.products p
  ORDER BY p.sku;
$function$;

-- Create replace functions (formerly upsert_*_for_dataset)
CREATE OR REPLACE FUNCTION public.replace_locations(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  TRUNCATE aifo.locations;
  
  INSERT INTO aifo.locations (
    code, name, order_days, production_lead_time, shipping_lead_time
  )
  SELECT 
    (rec->>'code')::text,
    (rec->>'name')::text,
    (rec->>'order_days')::text,
    (rec->>'production_lead_time')::integer,
    (rec->>'shipping_lead_time')::integer
  FROM jsonb_array_elements(records) AS rec;
END;
$function$;

CREATE OR REPLACE FUNCTION public.replace_products(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  TRUNCATE aifo.products CASCADE;
  
  INSERT INTO aifo.products (
    sku, name, group_1, group_2, group_3, 
    unit_cost, unit_price, pack_size, minimum_order_quantity
  )
  SELECT 
    (rec->>'sku')::text,
    (rec->>'name')::text,
    (rec->>'group_1')::text,
    (rec->>'group_2')::text,
    (rec->>'group_3')::text,
    (rec->>'unit_cost')::numeric,
    (rec->>'unit_price')::numeric,
    (rec->>'pack_size')::integer,
    (rec->>'minimum_order_quantity')::integer
  FROM jsonb_array_elements(records) AS rec;
END;
$function$;

CREATE OR REPLACE FUNCTION public.replace_sales(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  DELETE FROM aifo.fact_daily;
  
  INSERT INTO aifo.fact_daily (
    d, location_code, sku, units_sold, 
    on_hand_units, on_hand_units_sim
  )
  SELECT 
    (rec->>'d')::date,
    (rec->>'location_code')::text,
    (rec->>'sku')::text,
    (rec->>'units_sold')::numeric,
    0,
    0
  FROM jsonb_array_elements(records) AS rec
  ON CONFLICT (d, location_code, sku) DO UPDATE
  SET units_sold = EXCLUDED.units_sold;
END;
$function$;

CREATE OR REPLACE FUNCTION public.replace_inventory(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.fact_daily (
    d, location_code, sku, 
    on_hand_units, on_order_units, in_transit_units,
    on_hand_units_sim, units_sold
  )
  SELECT 
    (rec->>'d')::date,
    (rec->>'location_code')::text,
    (rec->>'sku')::text,
    (rec->>'on_hand_units')::numeric,
    (rec->>'on_order_units')::integer,
    (rec->>'in_transit_units')::integer,
    (rec->>'on_hand_units')::numeric,
    0
  FROM jsonb_array_elements(records) AS rec
  ON CONFLICT (d, location_code, sku) DO UPDATE
  SET 
    on_hand_units = EXCLUDED.on_hand_units,
    on_order_units = EXCLUDED.on_order_units,
    in_transit_units = EXCLUDED.in_transit_units,
    on_hand_units_sim = EXCLUDED.on_hand_units_sim;
END;
$function$;

-- Create export functions without dataset_id
CREATE OR REPLACE FUNCTION public.export_locations_data()
RETURNS TABLE(
  code text,
  name text,
  order_days text,
  production_lead_time integer,
  shipping_lead_time integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
  SELECT code, name, order_days, production_lead_time, shipping_lead_time
  FROM aifo.locations
  ORDER BY code;
$function$;

CREATE OR REPLACE FUNCTION public.export_products_data()
RETURNS TABLE(
  sku text,
  name text,
  group_1 text,
  group_2 text,
  group_3 text,
  unit_cost numeric,
  unit_price numeric,
  pack_size integer,
  minimum_order_quantity integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
  SELECT sku, name, group_1, group_2, group_3, 
         unit_cost, unit_price, pack_size, minimum_order_quantity
  FROM aifo.products
  ORDER BY sku;
$function$;

CREATE OR REPLACE FUNCTION public.export_sales_data()
RETURNS TABLE(
  d date,
  location_code text,
  sku text,
  units_sold numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
  SELECT d, location_code, sku, units_sold
  FROM aifo.fact_daily
  WHERE units_sold > 0
  ORDER BY d, location_code, sku;
$function$;

CREATE OR REPLACE FUNCTION public.export_inventory_data()
RETURNS TABLE(
  d date,
  location_code text,
  sku text,
  on_hand_units numeric,
  on_order_units integer,
  in_transit_units integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
  SELECT d, location_code, sku, on_hand_units, on_order_units, in_transit_units
  FROM aifo.fact_daily
  WHERE on_hand_units > 0 OR on_order_units > 0 OR in_transit_units > 0
  ORDER BY d, location_code, sku;
$function$;