-- Fix RPC functions to match actual column types in aifo schema

-- Drop and recreate export_locations_data with correct types
DROP FUNCTION IF EXISTS public.export_locations_data(UUID);
CREATE OR REPLACE FUNCTION public.export_locations_data(p_dataset_id UUID)
RETURNS TABLE(
  code TEXT,
  name TEXT,
  production_lead_time NUMERIC,
  shipping_lead_time NUMERIC,
  order_days TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, aifo
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.code,
    l.name,
    l.production_lead_time,
    l.shipping_lead_time,
    l.order_days
  FROM aifo.locations l
  WHERE l.dataset_id = p_dataset_id
  ORDER BY l.code;
END;
$$;

-- Drop and recreate export_products_data with correct types
DROP FUNCTION IF EXISTS public.export_products_data(UUID);
CREATE OR REPLACE FUNCTION public.export_products_data(p_dataset_id UUID)
RETURNS TABLE(
  sku TEXT,
  name TEXT,
  unit_cost NUMERIC,
  unit_price NUMERIC,
  pack_size NUMERIC,
  minimum_order_quantity NUMERIC,
  group_1 TEXT,
  group_2 TEXT,
  group_3 TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, aifo
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.sku,
    p.name,
    p.unit_cost,
    p.unit_price,
    p.pack_size,
    p.minimum_order_quantity,
    p.group_1,
    p.group_2,
    p.group_3
  FROM aifo.products p
  WHERE p.dataset_id = p_dataset_id
  ORDER BY p.sku;
END;
$$;

-- Drop and recreate export_inventory_data with correct types (NUMERIC not INTEGER)
DROP FUNCTION IF EXISTS public.export_inventory_data(UUID);
CREATE OR REPLACE FUNCTION public.export_inventory_data(p_dataset_id UUID)
RETURNS TABLE(
  d DATE,
  location_code TEXT,
  sku TEXT,
  on_hand_units NUMERIC,
  on_order_units NUMERIC,
  in_transit_units NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, aifo
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fd.d,
    fd.location_code,
    fd.sku,
    fd.on_hand_units,
    fd.on_order_units,
    fd.in_transit_units
  FROM aifo.fact_daily fd
  WHERE fd.dataset_id = p_dataset_id
    AND fd.on_hand_units IS NOT NULL
  ORDER BY fd.d, fd.location_code, fd.sku
  LIMIT 50000;
END;
$$;