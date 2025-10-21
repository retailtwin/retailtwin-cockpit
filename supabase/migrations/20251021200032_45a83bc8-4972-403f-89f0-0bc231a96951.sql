-- Drop old 2-parameter function versions that use NULL cost_price
-- This forces the frontend to use the corrected 4-parameter versions

DROP FUNCTION IF EXISTS public.calculate_riv(text, text);
DROP FUNCTION IF EXISTS public.get_kpi_data_aggregated(text, text);
DROP FUNCTION IF EXISTS public.get_kpi_data(text, text);
DROP FUNCTION IF EXISTS public.get_fact_daily(text, text);
DROP FUNCTION IF EXISTS public.get_fact_daily_aggregated(text, text);