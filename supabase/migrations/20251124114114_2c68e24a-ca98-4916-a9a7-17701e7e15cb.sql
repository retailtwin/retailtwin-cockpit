-- Drop the old function signature with DATE parameters to resolve overloading conflict
DROP FUNCTION IF EXISTS public.get_top_skus_by_metric(text, text, integer, date, date);

-- The new TEXT-based function with RIV and cash_impact support remains active
-- (created in migration 20251124113643)