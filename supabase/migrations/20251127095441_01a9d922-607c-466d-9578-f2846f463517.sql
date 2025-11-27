-- Add simulation columns to public.fact_daily
-- These columns will store the DBM calculation results

ALTER TABLE public.fact_daily 
ADD COLUMN IF NOT EXISTS on_hand_units_sim numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_units numeric,
ADD COLUMN IF NOT EXISTS economic_units numeric,
ADD COLUMN IF NOT EXISTS economic_overstock_units numeric;

-- Add helpful comment
COMMENT ON COLUMN public.fact_daily.on_hand_units_sim IS 'Simulated on-hand inventory after DBM calculations';
COMMENT ON COLUMN public.fact_daily.target_units IS 'DBM target (green zone) inventory level';
COMMENT ON COLUMN public.fact_daily.economic_units IS 'Economic inventory level from DBM';
COMMENT ON COLUMN public.fact_daily.economic_overstock_units IS 'Economic overstock units from DBM';