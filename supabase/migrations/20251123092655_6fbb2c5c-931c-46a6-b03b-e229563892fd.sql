-- Phase 1: Multi-Tenant Dataset Management System - Database Schema

-- 1.1 Create datasets table in public schema
CREATE TABLE public.datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Identity
  dataset_name text NOT NULL,
  dataset_slug text NOT NULL,
  description text,
  
  -- Processing status
  status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'active', 'error', 'archived')),
  error_message text,
  
  -- File tracking
  products_filename text,
  sales_filename text,
  inventory_filename text,
  locations_filename text,
  uploaded_at timestamptz DEFAULT now(),
  
  -- Data statistics (populated after ETL)
  date_range_start date,
  date_range_end date,
  total_locations int DEFAULT 0,
  total_products int DEFAULT 0,
  total_sales_records int DEFAULT 0,
  total_inventory_records int DEFAULT 0,
  
  -- Activation
  is_active boolean DEFAULT false,
  is_template boolean DEFAULT false,
  processed_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, dataset_slug)
);

CREATE INDEX idx_datasets_user_id ON public.datasets(user_id);
CREATE INDEX idx_datasets_user_active ON public.datasets(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_datasets_status ON public.datasets(status);

-- 1.2 Create dataset limits table
CREATE TABLE public.dataset_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  max_datasets int DEFAULT 1,
  max_file_size_mb int DEFAULT 50,
  max_records_per_dataset int DEFAULT 100000,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Insert default limits for all existing users
INSERT INTO public.dataset_limits (user_id, max_datasets, max_file_size_mb)
SELECT id, 1, 50 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 1.3 Add dataset_id to existing tables
ALTER TABLE aifo.fact_daily ADD COLUMN dataset_id uuid REFERENCES public.datasets(id) ON DELETE CASCADE;
ALTER TABLE aifo.locations ADD COLUMN dataset_id uuid REFERENCES public.datasets(id) ON DELETE CASCADE;
ALTER TABLE aifo.products ADD COLUMN dataset_id uuid REFERENCES public.datasets(id) ON DELETE CASCADE;
ALTER TABLE public.dbm_calculations ADD COLUMN dataset_id uuid REFERENCES public.datasets(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_fact_daily_dataset_location_sku_date ON aifo.fact_daily(dataset_id, location_code, sku, d);
CREATE INDEX idx_fact_daily_dataset ON aifo.fact_daily(dataset_id);
CREATE INDEX idx_locations_dataset ON aifo.locations(dataset_id);
CREATE INDEX idx_products_dataset ON aifo.products(dataset_id);
CREATE INDEX idx_dbm_calculations_dataset ON public.dbm_calculations(dataset_id);

-- 1.4 Create system template dataset and migrate existing data
DO $$
DECLARE
  template_dataset_id uuid;
  admin_user_id uuid;
BEGIN
  -- Get first admin user
  SELECT user_id INTO admin_user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  
  -- If no admin, use first user
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id FROM auth.users LIMIT 1;
  END IF;
  
  -- Create template dataset only if we have users
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.datasets (
      user_id,
      dataset_name,
      dataset_slug,
      description,
      status,
      is_active,
      is_template,
      date_range_start,
      date_range_end,
      total_locations,
      total_products,
      total_sales_records,
      processed_at
    ) VALUES (
      admin_user_id,
      'DK Case Study 2023',
      'dk-demo-2023',
      'Demonstration dataset based on DK Footwear case study covering full year 2023',
      'active',
      false,
      true,
      '2023-01-01',
      '2023-12-31',
      (SELECT COUNT(DISTINCT code) FROM aifo.locations WHERE dataset_id IS NULL),
      (SELECT COUNT(DISTINCT sku) FROM aifo.products WHERE dataset_id IS NULL),
      (SELECT COUNT(*) FROM aifo.fact_daily WHERE dataset_id IS NULL),
      now()
    ) RETURNING id INTO template_dataset_id;
    
    -- Assign existing data to template dataset
    UPDATE aifo.fact_daily SET dataset_id = template_dataset_id WHERE dataset_id IS NULL;
    UPDATE aifo.locations SET dataset_id = template_dataset_id WHERE dataset_id IS NULL;
    UPDATE aifo.products SET dataset_id = template_dataset_id WHERE dataset_id IS NULL;
    UPDATE public.dbm_calculations SET dataset_id = template_dataset_id WHERE dataset_id IS NULL;
  END IF;
END $$;

-- 1.5 Enable RLS and create policies
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_limits ENABLE ROW LEVEL SECURITY;

-- Datasets policies
CREATE POLICY "Users view own datasets and templates"
  ON public.datasets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_template = true);

CREATE POLICY "Users create own datasets"
  ON public.datasets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own datasets"
  ON public.datasets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own datasets"
  ON public.datasets FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND is_template = false);

CREATE POLICY "Admins manage all datasets"
  ON public.datasets FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Dataset limits policies
CREATE POLICY "Users view own limits"
  ON public.dataset_limits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage limits"
  ON public.dataset_limits FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 1.6 Update RPC functions to accept dataset_id
CREATE OR REPLACE FUNCTION public.get_kpi_data_aggregated(
  p_dataset_id uuid,
  p_location_code text,
  p_sku text,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  location_code text, sku text, days_total integer, sku_loc_days integer,
  tcm numeric, turns_current numeric, turns_sim numeric, mtv numeric,
  service_level numeric, service_level_sim numeric, missed_units numeric,
  riv numeric, riv_sim numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_total_sales_value numeric;
  v_avg_inventory_value numeric;
  v_avg_inventory_value_sim numeric;
  v_actual_sku_loc_days integer;
  v_service_level numeric;
  v_service_level_sim numeric;
  v_turns_current numeric;
  v_turns_sim numeric;
  v_tcm numeric;
  v_mtv numeric;
  v_missed_units numeric;
  v_days_in_range integer;
  v_riv numeric;
  v_riv_sim numeric;
BEGIN
  SELECT 
    COALESCE(SUM(fd.units_sold * p.unit_cost), 0),
    COALESCE(SUM(fd.units_sold), 0)
  INTO v_total_sales_value, v_missed_units
  FROM aifo.fact_daily fd
  JOIN aifo.products p ON fd.sku = p.sku AND fd.dataset_id = p.dataset_id
  WHERE 
    fd.dataset_id = p_dataset_id
    AND (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku = p_sku)
    AND (p_start_date IS NULL OR fd.d >= p_start_date)
    AND (p_end_date IS NULL OR fd.d <= p_end_date);

  SELECT 
    COALESCE(AVG(daily_inventory_value), 0),
    COALESCE(AVG(daily_inventory_value_sim), 0)
  INTO v_avg_inventory_value, v_avg_inventory_value_sim
  FROM (
    SELECT 
      fd.d,
      SUM(fd.on_hand_units * p.unit_cost) as daily_inventory_value,
      SUM(fd.on_hand_units_sim * p.unit_cost) as daily_inventory_value_sim
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku AND fd.dataset_id = p.dataset_id
    WHERE 
      fd.dataset_id = p_dataset_id
      AND (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
      AND (p_start_date IS NULL OR fd.d >= p_start_date)
      AND (p_end_date IS NULL OR fd.d <= p_end_date)
    GROUP BY fd.d
  ) daily_totals;

  SELECT 
    COALESCE((MAX(fd.d) - MIN(fd.d))::integer + 1, 0)
  INTO v_days_in_range
  FROM aifo.fact_daily fd
  WHERE 
    fd.dataset_id = p_dataset_id
    AND (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku = p_sku)
    AND (p_start_date IS NULL OR fd.d >= p_start_date)
    AND (p_end_date IS NULL OR fd.d <= p_end_date);

  SELECT 
    COUNT(DISTINCT (fd.location_code, fd.sku, fd.d))
  INTO v_actual_sku_loc_days
  FROM aifo.fact_daily fd
  WHERE 
    fd.dataset_id = p_dataset_id
    AND (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND (p_sku = 'ALL' OR fd.sku = p_sku)
    AND (p_start_date IS NULL OR fd.d >= p_start_date)
    AND (p_end_date IS NULL OR fd.d <= p_end_date);

  WITH sku_service_levels AS (
    SELECT 
      fd.location_code,
      fd.sku,
      COUNT(*) FILTER (WHERE fd.on_hand_units > 0)::numeric / NULLIF(COUNT(*), 0)::numeric as sku_service_level,
      COUNT(*) as total_days
    FROM aifo.fact_daily fd
    WHERE 
      fd.dataset_id = p_dataset_id
      AND (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
      AND (p_start_date IS NULL OR fd.d >= p_start_date)
      AND (p_end_date IS NULL OR fd.d <= p_end_date)
    GROUP BY fd.location_code, fd.sku
  )
  SELECT 
    COALESCE(SUM(sku_service_level * total_days) / NULLIF(SUM(total_days), 0), 0)
  INTO v_service_level
  FROM sku_service_levels;

  WITH sku_service_levels_sim AS (
    SELECT 
      fd.location_code,
      fd.sku,
      COUNT(*) FILTER (WHERE fd.on_hand_units_sim > 0)::numeric / NULLIF(COUNT(*), 0)::numeric as sku_service_level_sim,
      COUNT(*) as total_days
    FROM aifo.fact_daily fd
    WHERE 
      fd.dataset_id = p_dataset_id
      AND (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
      AND (p_start_date IS NULL OR fd.d >= p_start_date)
      AND (p_end_date IS NULL OR fd.d <= p_end_date)
    GROUP BY fd.location_code, fd.sku
  )
  SELECT 
    COALESCE(SUM(sku_service_level_sim * total_days) / NULLIF(SUM(total_days), 0), 0)
  INTO v_service_level_sim
  FROM sku_service_levels_sim;

  v_turns_current := CASE 
    WHEN v_avg_inventory_value > 0 THEN v_total_sales_value / v_avg_inventory_value
    ELSE 0
  END;

  v_turns_sim := CASE 
    WHEN v_avg_inventory_value_sim > 0 THEN v_total_sales_value / v_avg_inventory_value_sim
    ELSE 0
  END;

  WITH margin_calc AS (
    SELECT 
      SUM(fd.units_sold * (p.unit_price - p.unit_cost)) as total_margin
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku AND fd.dataset_id = p.dataset_id
    WHERE 
      fd.dataset_id = p_dataset_id
      AND (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND (p_sku = 'ALL' OR fd.sku = p_sku)
      AND (p_start_date IS NULL OR fd.d >= p_start_date)
      AND (p_end_date IS NULL OR fd.d <= p_end_date)
  )
  SELECT COALESCE(total_margin, 0) INTO v_tcm FROM margin_calc;

  v_mtv := CASE 
    WHEN v_service_level > 0 AND v_service_level < 1 THEN (v_tcm / v_service_level) - v_tcm
    ELSE 0
  END;

  v_riv := 0;
  v_riv_sim := 0;

  RETURN QUERY SELECT 
    CASE WHEN p_location_code = 'ALL' THEN 'ALL' ELSE p_location_code END,
    CASE WHEN p_sku = 'ALL' THEN 'ALL' ELSE p_sku END,
    v_days_in_range,
    v_actual_sku_loc_days,
    v_tcm,
    v_turns_current,
    v_turns_sim,
    v_mtv,
    v_service_level,
    v_service_level_sim,
    v_missed_units,
    v_riv,
    v_riv_sim;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_fact_daily_aggregated(
  p_dataset_id uuid,
  p_location_code text,
  p_sku text,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  d date, location_code text, sku text,
  units_sold numeric, on_hand_units numeric, on_hand_units_sim numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
  SELECT 
    d,
    CASE WHEN p_location_code = 'ALL' THEN 'ALL' ELSE p_location_code END as location_code,
    CASE WHEN p_sku = 'ALL' THEN 'ALL' ELSE p_sku END as sku,
    SUM(units_sold) as units_sold,
    SUM(on_hand_units) as on_hand_units,
    SUM(on_hand_units_sim) as on_hand_units_sim
  FROM aifo.fact_daily
  WHERE 
    dataset_id = p_dataset_id
    AND (p_location_code = 'ALL' OR location_code = p_location_code)
    AND (p_sku = 'ALL' OR sku = p_sku)
    AND (p_start_date IS NULL OR d >= p_start_date)
    AND (p_end_date IS NULL OR d <= p_end_date)
  GROUP BY d
  ORDER BY d;
$function$;

CREATE OR REPLACE FUNCTION public.get_fact_daily_raw(
  p_dataset_id uuid,
  p_location_code text,
  p_sku text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  d date, location_code text, sku text, units_sold numeric,
  on_hand_units numeric, on_order_units integer, in_transit_units integer,
  on_hand_units_sim numeric, target_units numeric, economic_units numeric,
  economic_overstock_units numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
  SELECT 
    d, location_code, sku, units_sold, on_hand_units,
    on_order_units, in_transit_units, on_hand_units_sim,
    target_units, economic_units, economic_overstock_units
  FROM aifo.fact_daily
  WHERE 
    dataset_id = p_dataset_id
    AND (p_location_code = 'ALL' OR location_code = p_location_code)
    AND (p_sku = 'ALL' OR sku = p_sku)
    AND d >= p_start_date
    AND d <= p_end_date
  ORDER BY d;
$function$;

CREATE OR REPLACE FUNCTION public.get_sku_details(
  p_dataset_id uuid,
  p_location_code text,
  p_sku text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  sku text, sku_name text, total_units_sold numeric,
  avg_daily_sales numeric, stockout_days integer,
  avg_on_hand numeric, max_on_hand numeric, min_on_hand numeric,
  days_with_data integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    fd.sku,
    p.name as sku_name,
    SUM(fd.units_sold) as total_units_sold,
    AVG(fd.units_sold) as avg_daily_sales,
    COUNT(*) FILTER (WHERE fd.on_hand_units = 0)::integer as stockout_days,
    AVG(fd.on_hand_units) as avg_on_hand,
    MAX(fd.on_hand_units) as max_on_hand,
    MIN(fd.on_hand_units) as min_on_hand,
    COUNT(*)::integer as days_with_data
  FROM aifo.fact_daily fd
  JOIN aifo.products p ON fd.sku = p.sku AND fd.dataset_id = p.dataset_id
  WHERE 
    fd.dataset_id = p_dataset_id
    AND (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND fd.sku = p_sku
    AND fd.d >= p_start_date
    AND fd.d <= p_end_date
  GROUP BY fd.sku, p.name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_pareto_analysis(
  p_dataset_id uuid,
  p_location_code text,
  p_sku text DEFAULT 'ALL',
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  sku text, sku_name text, total_units_sold numeric,
  cumulative_units numeric, cumulative_percent numeric,
  rank integer, total_skus integer, is_selected_sku boolean,
  availability_percent numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
BEGIN
  RETURN QUERY
  WITH sku_sales AS (
    SELECT 
      fd.sku as sales_sku,
      p.name as sku_name,
      SUM(fd.units_sold) as total_units,
      COUNT(DISTINCT fd.d) FILTER (WHERE fd.on_hand_units > 0)::numeric / 
        NULLIF(COUNT(DISTINCT fd.d), 0)::numeric * 100 as availability_pct
    FROM aifo.fact_daily fd
    JOIN aifo.products p ON fd.sku = p.sku AND fd.dataset_id = p.dataset_id
    WHERE 
      fd.dataset_id = p_dataset_id
      AND (p_location_code = 'ALL' OR fd.location_code = p_location_code)
      AND fd.d <= p_date
      AND fd.d >= (p_date - INTERVAL '90 days')
    GROUP BY fd.sku, p.name
    HAVING SUM(fd.units_sold) > 0
  ),
  ranked_skus AS (
    SELECT 
      ss.sales_sku,
      ss.sku_name,
      ss.total_units,
      ss.availability_pct,
      ROW_NUMBER() OVER (ORDER BY ss.total_units DESC) as sku_rank,
      SUM(ss.total_units) OVER (ORDER BY ss.total_units DESC) as cumulative,
      SUM(ss.total_units) OVER () as grand_total,
      COUNT(*) OVER () as total_count
    FROM sku_sales ss
  )
  SELECT 
    rs.sales_sku::text,
    rs.sku_name::text,
    rs.total_units,
    rs.cumulative,
    (rs.cumulative / NULLIF(rs.grand_total, 0) * 100)::numeric as cumulative_percent,
    rs.sku_rank::integer,
    rs.total_count::integer,
    (p_sku != 'ALL' AND rs.sales_sku = p_sku) as is_selected_sku,
    rs.availability_pct
  FROM ranked_skus rs
  ORDER BY rs.sku_rank;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_inventory_zones_report(
  p_dataset_id uuid,
  p_location_code text DEFAULT 'ALL',
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  sku text, sku_name text, rolling_21d_sales numeric,
  rolling_21d_avg_daily numeric, avg_on_hand numeric,
  avg_target numeric, avg_economic numeric,
  avg_economic_overstock numeric, avg_weekly_sales numeric,
  stockout_days integer, total_days integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $function$
DECLARE
  v_start_date date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '90 days');
  v_end_date date := COALESCE(p_end_date, CURRENT_DATE);
  v_rolling_start_date date := v_end_date - INTERVAL '21 days';
BEGIN
  RETURN QUERY
  SELECT 
    fd.sku,
    p.name as sku_name,
    SUM(fd.units_sold) FILTER (WHERE fd.d > v_rolling_start_date) as rolling_21d_sales,
    AVG(fd.units_sold) FILTER (WHERE fd.d > v_rolling_start_date) as rolling_21d_avg_daily,
    AVG(fd.on_hand_units) as avg_on_hand,
    AVG(fd.target_units) as avg_target,
    AVG(fd.economic_units) as avg_economic,
    AVG(fd.economic_overstock_units) as avg_economic_overstock,
    AVG(fd.units_sold) * 7 as avg_weekly_sales,
    COUNT(*) FILTER (WHERE fd.on_hand_units = 0)::integer as stockout_days,
    COUNT(*)::integer as total_days
  FROM aifo.fact_daily fd
  JOIN aifo.products p ON fd.sku = p.sku AND fd.dataset_id = p.dataset_id
  WHERE 
    fd.dataset_id = p_dataset_id
    AND (p_location_code = 'ALL' OR fd.location_code = p_location_code)
    AND fd.d >= v_start_date
    AND fd.d <= v_end_date
  GROUP BY fd.sku, p.name
  HAVING SUM(fd.units_sold) FILTER (WHERE fd.d > v_rolling_start_date) > 0
  ORDER BY rolling_21d_sales DESC;
END;
$function$;