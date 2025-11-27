-- Create get_kpi_data function for single SKU-location queries
-- This is the non-aggregated version that was missing

CREATE OR REPLACE FUNCTION public.get_kpi_data(
  p_location_code text,
  p_sku text,
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL
)
RETURNS TABLE(
  location_code text,
  sku text,
  days_total integer,
  sku_loc_days integer,
  tcm numeric,
  turns_current numeric,
  turns_sim numeric,
  mtv numeric,
  service_level numeric,
  service_level_sim numeric,
  riv numeric,
  riv_sim numeric,
  missed_units numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH date_range AS (
    SELECT 
      COALESCE(p_start_date::date, MIN(day)) as start_date,
      COALESCE(p_end_date::date, MAX(day)) as end_date
    FROM fact_daily
    WHERE location_code::text = p_location_code
      AND sku::text = p_sku
  ),
  facts AS (
    SELECT 
      fd.location_code::text,
      fd.sku::text,
      fd.day,
      fd.units_sold,
      fd.units_on_hand,
      fd.on_hand_units_sim,
      fd.target_units,
      p.cost_price,
      p.sales_price
    FROM fact_daily fd
    CROSS JOIN date_range dr
    LEFT JOIN products p ON p.sku = fd.sku
    WHERE fd.location_code::text = p_location_code
      AND fd.sku::text = p_sku
      AND fd.day >= dr.start_date
      AND fd.day <= dr.end_date
  )
  SELECT 
    p_location_code as location_code,
    p_sku as sku,
    COUNT(DISTINCT f.day)::integer as days_total,
    COUNT(*)::integer as sku_loc_days,
    
    -- TCM: Total Capital Managed (average inventory value at cost)
    ROUND(AVG(COALESCE(f.units_on_hand, 0) * COALESCE(f.cost_price, 0)), 2) as tcm,
    
    -- Turns Current: (Total Sales * Cost Price) / Average Inventory Value
    CASE 
      WHEN AVG(COALESCE(f.units_on_hand, 0) * COALESCE(f.cost_price, 0)) > 0
      THEN ROUND((SUM(COALESCE(f.units_sold, 0)) * AVG(COALESCE(f.cost_price, 0))) / 
                 (AVG(COALESCE(f.units_on_hand, 0) * COALESCE(f.cost_price, 0))), 2)
      ELSE 0
    END as turns_current,
    
    -- Turns Sim: (Total Sales * Cost Price) / Average Simulated Inventory Value
    CASE 
      WHEN AVG(COALESCE(f.on_hand_units_sim, 0) * COALESCE(f.cost_price, 0)) > 0
      THEN ROUND((SUM(COALESCE(f.units_sold, 0)) * AVG(COALESCE(f.cost_price, 0))) / 
                 (AVG(COALESCE(f.on_hand_units_sim, 0) * COALESCE(f.cost_price, 0))), 2)
      ELSE 0
    END as turns_sim,
    
    -- MTV: Missed Transaction Value
    ROUND(SUM(
      CASE 
        WHEN COALESCE(f.units_on_hand, 0) = 0 AND COALESCE(f.units_sold, 0) > 0
        THEN COALESCE(f.units_sold, 0) * COALESCE(f.sales_price, 0)
        ELSE 0
      END
    ), 2) as mtv,
    
    -- Service Level: Days with inventory / Total days
    ROUND(
      (COUNT(CASE WHEN COALESCE(f.units_on_hand, 0) > 0 THEN 1 END)::numeric / 
       NULLIF(COUNT(*)::numeric, 0)) * 100, 
      2
    ) as service_level,
    
    -- Service Level Sim: Days with simulated inventory / Total days
    ROUND(
      (COUNT(CASE WHEN COALESCE(f.on_hand_units_sim, 0) > 0 THEN 1 END)::numeric / 
       NULLIF(COUNT(*)::numeric, 0)) * 100, 
      2
    ) as service_level_sim,
    
    -- RIV: Retail Inventory Value (current)
    ROUND(AVG(COALESCE(f.units_on_hand, 0) * COALESCE(f.sales_price, 0)), 2) as riv,
    
    -- RIV Sim: Retail Inventory Value (simulated)
    ROUND(AVG(COALESCE(f.on_hand_units_sim, 0) * COALESCE(f.sales_price, 0)), 2) as riv_sim,
    
    -- Missed Units: Total units that couldn't be sold due to stockout
    SUM(
      CASE 
        WHEN COALESCE(f.units_on_hand, 0) = 0 AND COALESCE(f.units_sold, 0) > 0
        THEN COALESCE(f.units_sold, 0)
        ELSE 0
      END
    )::numeric as missed_units
  FROM facts f
  GROUP BY p_location_code, p_sku;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_kpi_data(text, text, text, text) TO anon, authenticated, service_role;