-- Fix get_top_skus_by_metric to use correct schema for dbm_calculations (public not aifo)
CREATE OR REPLACE FUNCTION public.get_top_skus_by_metric(
  p_location_code TEXT,
  p_metric TEXT DEFAULT 'sales',
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  sku TEXT,
  sku_name TEXT,
  metric_value NUMERIC,
  units_sold NUMERIC,
  avg_inventory NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Get date range from aifo.fact_daily, supporting 'ALL' location
  SELECT
    COALESCE(p_start_date::DATE, MIN(d)),
    COALESCE(p_end_date::DATE, MAX(d))
  INTO v_start_date, v_end_date
  FROM aifo.fact_daily
  WHERE (p_location_code = 'ALL' OR location_code = p_location_code);

  RETURN QUERY
  WITH sku_metrics AS (
    SELECT
      fd.sku,
      p.name AS sku_name,
      SUM(fd.units_sold) AS total_units_sold,
      AVG(fd.on_hand_units) AS avg_on_hand,
      -- MTV: Missing Throughput Value (stockout cost)
      SUM(
        CASE
          WHEN fd.on_hand_units = 0 THEN fd.units_sold * p.unit_price
          ELSE 0
        END
      ) AS mtv,
      -- RIV: Redundant Inventory Value (overstock cost)
      SUM(
        CASE
          WHEN fd.on_hand_units > COALESCE(ec.economic_units, fd.on_hand_units)
            THEN (fd.on_hand_units - COALESCE(ec.economic_units, fd.on_hand_units)) * p.unit_cost
          ELSE 0
        END
      ) AS riv,
      COUNT(
        CASE WHEN fd.on_hand_units = 0 AND fd.units_sold > 0 THEN 1 END
      ) AS stockout_days,
      -- Inventory turns
      CASE
        WHEN AVG(fd.on_hand_units) > 0
          THEN SUM(fd.units_sold) / AVG(fd.on_hand_units)
        ELSE 0
      END AS turns
    FROM aifo.fact_daily fd
    LEFT JOIN aifo.products p ON fd.sku = p.sku
    LEFT JOIN public.dbm_calculations ec 
      ON fd.sku = ec.sku
      AND fd.location_code = ec.location_code
      AND fd.d = ec.calculation_date
    WHERE
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND fd.d BETWEEN v_start_date AND v_end_date
    GROUP BY fd.sku, p.name, p.unit_price, p.unit_cost
  )
  SELECT
    sm.sku,
    sm.sku_name,
    CASE p_metric
      WHEN 'sales' THEN sm.total_units_sold
      WHEN 'stockout_days' THEN sm.stockout_days
      WHEN 'turns' THEN sm.turns
      WHEN 'mtv' THEN sm.mtv
      WHEN 'riv' THEN sm.riv
      WHEN 'cash_impact' THEN sm.mtv + sm.riv
      ELSE sm.total_units_sold
    END AS metric_value,
    sm.total_units_sold,
    sm.avg_on_hand
  FROM sku_metrics sm
  ORDER BY metric_value DESC NULLS LAST
  LIMIT p_limit;
END;
$$;