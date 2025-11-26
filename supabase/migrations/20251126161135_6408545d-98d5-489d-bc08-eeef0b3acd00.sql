-- Drop existing aifo schema if it exists (CASCADE will drop all dependent objects)
DROP SCHEMA IF EXISTS aifo CASCADE;

-- Create aifo schema for versioned simulation data
CREATE SCHEMA aifo;

-- aifo.locations: versioned location data
CREATE TABLE aifo.locations (
  dataset_id uuid NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  production_lead_time integer DEFAULT 0,
  shipping_lead_time integer DEFAULT 0,
  order_days text DEFAULT 'mon,tue,wed,thu,fri,sat,sun',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (dataset_id, code)
);

-- aifo.products: versioned product data
CREATE TABLE aifo.products (
  dataset_id uuid NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  unit_cost numeric NOT NULL,
  unit_price numeric NOT NULL,
  pack_size integer DEFAULT 1,
  minimum_order_quantity integer DEFAULT 1,
  group_1 text,
  group_2 text,
  group_3 text,
  target_max_units numeric,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (dataset_id, sku)
);

-- aifo.sales: versioned sales data
CREATE TABLE aifo.sales (
  dataset_id uuid NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  d date NOT NULL,
  location_code text NOT NULL,
  sku text NOT NULL,
  units_sold numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (dataset_id, d, location_code, sku)
);

-- aifo.inventory: versioned inventory data
CREATE TABLE aifo.inventory (
  dataset_id uuid NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  d date NOT NULL,
  location_code text NOT NULL,
  sku text NOT NULL,
  on_hand_units numeric DEFAULT 0,
  on_order_units numeric DEFAULT 0,
  in_transit_units numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (dataset_id, d, location_code, sku)
);

-- aifo.fact_daily: combined view of sales + inventory for simulations
CREATE TABLE aifo.fact_daily (
  dataset_id uuid NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  d date NOT NULL,
  location_code text NOT NULL,
  sku text NOT NULL,
  units_sold numeric DEFAULT 0,
  on_hand_units numeric DEFAULT 0,
  on_order_units numeric DEFAULT 0,
  in_transit_units numeric DEFAULT 0,
  on_hand_units_sim numeric DEFAULT 0,
  target_units numeric,
  economic_units numeric,
  economic_overstock_units numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (dataset_id, d, location_code, sku)
);

-- Enable RLS on all aifo tables
ALTER TABLE aifo.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aifo.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE aifo.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE aifo.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE aifo.fact_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access data for their datasets
CREATE POLICY "Users access own dataset locations" ON aifo.locations
  FOR ALL USING (
    dataset_id IN (SELECT id FROM public.datasets WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users access own dataset products" ON aifo.products
  FOR ALL USING (
    dataset_id IN (SELECT id FROM public.datasets WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users access own dataset sales" ON aifo.sales
  FOR ALL USING (
    dataset_id IN (SELECT id FROM public.datasets WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users access own dataset inventory" ON aifo.inventory
  FOR ALL USING (
    dataset_id IN (SELECT id FROM public.datasets WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users access own dataset fact_daily" ON aifo.fact_daily
  FOR ALL USING (
    dataset_id IN (SELECT id FROM public.datasets WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Helper function: Upsert locations for dataset
CREATE OR REPLACE FUNCTION public.upsert_locations_for_dataset(
  p_dataset_id uuid,
  records jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, aifo
AS $$
BEGIN
  INSERT INTO aifo.locations (
    dataset_id, code, name, production_lead_time, shipping_lead_time, order_days
  )
  SELECT 
    p_dataset_id,
    (rec->>'code')::text,
    (rec->>'name')::text,
    COALESCE((rec->>'production_lead_time')::integer, 0),
    COALESCE((rec->>'shipping_lead_time')::integer, 0),
    COALESCE((rec->>'order_days')::text, 'mon,tue,wed,thu,fri,sat,sun')
  FROM jsonb_array_elements(records) AS rec
  ON CONFLICT (dataset_id, code) 
  DO UPDATE SET
    name = EXCLUDED.name,
    production_lead_time = EXCLUDED.production_lead_time,
    shipping_lead_time = EXCLUDED.shipping_lead_time,
    order_days = EXCLUDED.order_days;
END;
$$;

-- Helper function: Upsert products for dataset
CREATE OR REPLACE FUNCTION public.upsert_products_for_dataset(
  p_dataset_id uuid,
  records jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, aifo
AS $$
BEGIN
  INSERT INTO aifo.products (
    dataset_id, sku, name, unit_cost, unit_price, pack_size, 
    minimum_order_quantity, group_1, group_2, group_3
  )
  SELECT 
    p_dataset_id,
    (rec->>'sku')::text,
    (rec->>'name')::text,
    (rec->>'unit_cost')::numeric,
    (rec->>'unit_price')::numeric,
    COALESCE((rec->>'pack_size')::integer, 1),
    COALESCE((rec->>'minimum_order_quantity')::integer, 1),
    (rec->>'group_1')::text,
    (rec->>'group_2')::text,
    (rec->>'group_3')::text
  FROM jsonb_array_elements(records) AS rec
  ON CONFLICT (dataset_id, sku) 
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
$$;

-- Helper function: Insert sales for dataset
CREATE OR REPLACE FUNCTION public.insert_sales_for_dataset(
  p_dataset_id uuid,
  records jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, aifo
AS $$
BEGIN
  INSERT INTO aifo.sales (
    dataset_id, d, location_code, sku, units_sold
  )
  SELECT 
    p_dataset_id,
    (rec->>'d')::date,
    (rec->>'location_code')::text,
    (rec->>'sku')::text,
    COALESCE((rec->>'units_sold')::numeric, 0)
  FROM jsonb_array_elements(records) AS rec
  ON CONFLICT (dataset_id, d, location_code, sku) 
  DO UPDATE SET
    units_sold = EXCLUDED.units_sold;
END;
$$;

-- Helper function: Upsert inventory for dataset
CREATE OR REPLACE FUNCTION public.upsert_inventory_for_dataset(
  p_dataset_id uuid,
  records jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, aifo
AS $$
BEGIN
  INSERT INTO aifo.inventory (
    dataset_id, d, location_code, sku, on_hand_units, on_order_units, in_transit_units
  )
  SELECT 
    p_dataset_id,
    (rec->>'d')::date,
    (rec->>'location_code')::text,
    (rec->>'sku')::text,
    COALESCE((rec->>'on_hand_units')::numeric, 0),
    COALESCE((rec->>'on_order_units')::numeric, 0),
    COALESCE((rec->>'in_transit_units')::numeric, 0)
  FROM jsonb_array_elements(records) AS rec
  ON CONFLICT (dataset_id, d, location_code, sku) 
  DO UPDATE SET
    on_hand_units = EXCLUDED.on_hand_units,
    on_order_units = EXCLUDED.on_order_units,
    in_transit_units = EXCLUDED.in_transit_units;
END;
$$;