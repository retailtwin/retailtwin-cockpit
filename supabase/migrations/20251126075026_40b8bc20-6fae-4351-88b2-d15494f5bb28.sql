-- Create locations table
CREATE TABLE IF NOT EXISTS public.locations (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  production_lead_time INTEGER DEFAULT 0,
  shipping_lead_time INTEGER DEFAULT 0,
  order_days TEXT DEFAULT 'mon,tue,wed,thu,fri,sat,sun'
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cost_price NUMERIC NOT NULL,
  sales_price NUMERIC NOT NULL,
  pack_size INTEGER DEFAULT 1,
  minimum_order_quantity INTEGER DEFAULT 1,
  group_1 TEXT,
  group_2 TEXT,
  group_3 TEXT
);

-- Create fact_daily table
CREATE TABLE IF NOT EXISTS public.fact_daily (
  day DATE NOT NULL,
  location_code TEXT NOT NULL,
  sku TEXT NOT NULL,
  units_sold NUMERIC DEFAULT 0,
  units_on_hand NUMERIC DEFAULT 0,
  units_on_order NUMERIC DEFAULT 0,
  units_in_transit NUMERIC DEFAULT 0,
  PRIMARY KEY (day, location_code, sku)
);

-- Create dataset_metadata table
CREATE TABLE IF NOT EXISTS public.dataset_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE,
  end_date DATE,
  total_records INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage locations" ON public.locations
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage fact_daily" ON public.fact_daily
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage dataset_metadata" ON public.dataset_metadata
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));