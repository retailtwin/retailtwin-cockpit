-- Create RPC functions to access aifo schema tables

CREATE OR REPLACE FUNCTION public.get_locations()
RETURNS TABLE (code TEXT, name TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT code, name FROM aifo.locations ORDER BY name;
$$;

CREATE OR REPLACE FUNCTION public.get_products()
RETURNS TABLE (sku TEXT, name TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT sku, name FROM aifo.products ORDER BY name;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_data(p_location_code TEXT, p_sku TEXT)
RETURNS TABLE (
  location_code TEXT,
  sku TEXT,
  days_total INT,
  tcm NUMERIC,
  turns_current NUMERIC,
  turns_sim NUMERIC,
  stockout_days BIGINT,
  stockout_days_sim BIGINT,
  mtv NUMERIC,
  service_level NUMERIC,
  missed_units NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    location_code, 
    sku, 
    days_total,
    tcm,
    turns_current,
    turns_sim,
    stockout_days,
    stockout_days_sim,
    mtv,
    service_level,
    missed_units
  FROM aifo.kpi_current 
  WHERE location_code = p_location_code 
    AND sku = p_sku;
$$;

CREATE OR REPLACE FUNCTION public.get_fact_daily(p_location_code TEXT, p_sku TEXT)
RETURNS TABLE (
  d DATE,
  location_code TEXT,
  sku TEXT,
  units_sold NUMERIC,
  on_hand_units NUMERIC,
  on_hand_units_sim NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    d, 
    location_code, 
    sku, 
    units_sold, 
    on_hand_units, 
    on_hand_units_sim
  FROM aifo.fact_daily 
  WHERE location_code = p_location_code 
    AND sku = p_sku
  ORDER BY d;
$$;