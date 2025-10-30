-- Create dbm_calculations table to store results from DBM analysis
CREATE TABLE IF NOT EXISTS public.dbm_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_code TEXT NOT NULL,
  sku TEXT NOT NULL,
  calculation_date DATE NOT NULL,
  target_units NUMERIC,
  economic_units NUMERIC,
  economic_overstock_units NUMERIC,
  on_hand_units NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(location_code, sku, calculation_date)
);

-- Enable Row Level Security
ALTER TABLE public.dbm_calculations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read
CREATE POLICY "Allow authenticated users to read dbm_calculations"
  ON public.dbm_calculations
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow all authenticated users to insert
CREATE POLICY "Allow authenticated users to insert dbm_calculations"
  ON public.dbm_calculations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_dbm_calculations_location_code ON public.dbm_calculations(location_code);
CREATE INDEX idx_dbm_calculations_sku ON public.dbm_calculations(sku);
CREATE INDEX idx_dbm_calculations_date ON public.dbm_calculations(calculation_date DESC);