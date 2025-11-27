-- Create export functions for public schema data
-- These functions export data from public.fact_daily, public.locations, public.products

-- Export locations from public schema
CREATE OR REPLACE FUNCTION public.export_public_locations_data()
RETURNS TABLE(
  code text,
  name text,
  production_lead_time integer,
  shipping_lead_time integer,
  order_days text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    code,
    name,
    COALESCE(production_lead_time, 0) as production_lead_time,
    COALESCE(shipping_lead_time, 0) as shipping_lead_time,
    COALESCE(order_days, 'mon,tue,wed,thu,fri,sat,sun') as order_days
  FROM public.locations
  ORDER BY code;
$$;

-- Export products from public schema
CREATE OR REPLACE FUNCTION public.export_public_products_data()
RETURNS TABLE(
  sku text,
  name text,
  unit_cost numeric,
  unit_price numeric,
  pack_size integer,
  minimum_order_quantity integer,
  group_1 text,
  group_2 text,
  group_3 text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    sku,
    name,
    cost_price as unit_cost,
    sales_price as unit_price,
    COALESCE(pack_size, 1) as pack_size,
    COALESCE(minimum_order_quantity, 1) as minimum_order_quantity,
    group_1,
    group_2,
    group_3
  FROM public.products
  ORDER BY sku;
$$;

-- Export sales data from public.fact_daily
CREATE OR REPLACE FUNCTION public.export_public_sales_data()
RETURNS TABLE(
  d date,
  location_code text,
  sku text,
  units_sold numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    day as d,
    location_code,
    sku,
    COALESCE(units_sold, 0) as units_sold
  FROM public.fact_daily
  WHERE units_sold > 0
  ORDER BY day, location_code, sku;
$$;

-- Export inventory data from public.fact_daily
CREATE OR REPLACE FUNCTION public.export_public_inventory_data()
RETURNS TABLE(
  d date,
  location_code text,
  sku text,
  on_hand_units numeric,
  on_order_units numeric,
  in_transit_units numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    day as d,
    location_code,
    sku,
    COALESCE(units_on_hand, 0) as on_hand_units,
    COALESCE(units_on_order, 0) as on_order_units,
    COALESCE(units_in_transit, 0) as in_transit_units
  FROM public.fact_daily
  WHERE units_on_hand > 0 OR units_on_order > 0 OR units_in_transit > 0
  ORDER BY day, location_code, sku;
$$;