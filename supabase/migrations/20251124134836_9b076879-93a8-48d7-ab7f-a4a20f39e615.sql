-- Optimize get_fact_daily_raw to filter out SKUs with zero sales
-- This reduces dataset size and processing time by excluding dead stock from DBM calculations
CREATE OR REPLACE FUNCTION public.get_fact_daily_raw(
  p_location_code TEXT,
  p_sku TEXT,
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS TABLE(
  d date,
  location_code text,
  sku text,
  units_sold numeric,
  on_hand_units numeric,
  on_order_units integer,
  in_transit_units integer,
  on_hand_units_sim numeric,
  target_units numeric,
  economic_units numeric,
  economic_overstock_units numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fd.d,
    fd.location_code,
    fd.sku,
    fd.units_sold,
    fd.on_hand_units,
    fd.on_order_units,
    fd.in_transit_units,
    fd.on_hand_units_sim,
    fd.target_units,
    fd.economic_units,
    fd.economic_overstock_units
  FROM aifo.fact_daily fd
  WHERE
    (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku = p_sku)
    AND fd.d >= p_start_date::date
    AND fd.d <= p_end_date::date
    -- OPTIMIZATION: Only include SKU-Location combinations that have sales
    -- This filters out dead stock that doesn't need DBM calculations
    AND EXISTS (
      SELECT 1 
      FROM aifo.fact_daily fd2
      WHERE fd2.sku = fd.sku 
        AND fd2.location_code = fd.location_code
        AND fd2.d >= p_start_date::date
        AND fd2.d <= p_end_date::date
      GROUP BY fd2.sku, fd2.location_code
      HAVING SUM(fd2.units_sold) > 0
    )
  ORDER BY fd.location_code, fd.sku, fd.d;
END;
$$;