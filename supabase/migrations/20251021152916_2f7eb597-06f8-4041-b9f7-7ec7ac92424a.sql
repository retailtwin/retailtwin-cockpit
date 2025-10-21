-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- Ensure anon role has execute permissions on the function
GRANT EXECUTE ON FUNCTION public.get_kpi_data_aggregated(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_kpi_data(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_fact_daily_aggregated(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_fact_daily(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_locations() TO anon;
GRANT EXECUTE ON FUNCTION public.get_products() TO anon;

-- Add a comment to ensure schema change detection
COMMENT ON FUNCTION public.get_kpi_data_aggregated IS 'Aggregates KPI data across locations and SKUs with corrected inventory turns calculation';