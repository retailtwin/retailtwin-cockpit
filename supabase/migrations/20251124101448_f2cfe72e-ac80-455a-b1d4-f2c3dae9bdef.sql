-- Phase 1: Create clear and batch insert functions for proper data loading

-- Clear functions (run once per upload)
CREATE OR REPLACE FUNCTION public.clear_sales_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  DELETE FROM aifo.fact_daily WHERE units_sold IS NOT NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clear_inventory_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  DELETE FROM aifo.fact_daily 
  WHERE on_hand_units IS NOT NULL 
     OR on_order_units IS NOT NULL 
     OR in_transit_units IS NOT NULL;
END;
$function$;

-- Batch insert functions (called multiple times for large datasets)
CREATE OR REPLACE FUNCTION public.insert_sales_batch(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  INSERT INTO aifo.fact_daily (d, location_code, sku, units_sold, on_hand_units, on_hand_units_sim)
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

CREATE OR REPLACE FUNCTION public.insert_inventory_batch(records jsonb)
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

-- Update replace_inventory as backup with proper WHERE clause
CREATE OR REPLACE FUNCTION public.replace_inventory(records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  -- Clear existing inventory data with WHERE clause
  DELETE FROM aifo.fact_daily 
  WHERE on_hand_units IS NOT NULL 
     OR on_order_units IS NOT NULL 
     OR in_transit_units IS NOT NULL;
  
  -- Insert new inventory data
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