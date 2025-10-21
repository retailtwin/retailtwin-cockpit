-- Fix RIV calculation to use unit_cost instead of cost_price
CREATE OR REPLACE FUNCTION public.calculate_riv(p_location_code text, p_sku text, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_avg_riv numeric := 0;
BEGIN
  -- Calculate RIV for each day, then average across all days in range
  WITH daily_riv AS (
    SELECT 
      fd.d,
      SUM(
        CASE 
          WHEN fd.economic_units > fd.target_units 
          THEN (fd.economic_units - fd.target_units) * p.unit_cost
          ELSE 0 
        END
      ) as day_riv
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku
    WHERE 
      (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
      AND (p_start_date IS NULL OR fd.d >= p_start_date)
      AND (p_end_date IS NULL OR fd.d <= p_end_date)
    GROUP BY fd.d
  )
  SELECT 
    COALESCE(AVG(day_riv), 0)
  INTO v_avg_riv
  FROM daily_riv;

  RETURN v_avg_riv;
END;
$function$;