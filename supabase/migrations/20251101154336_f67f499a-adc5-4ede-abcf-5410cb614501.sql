-- Create system_settings table for DBM configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL,
  scope text NOT NULL CHECK (scope IN ('global', 'location', 'sku')),
  scope_ref text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(setting_key, scope, scope_ref)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies using existing has_role function
CREATE POLICY "Admin can view settings"
  ON system_settings FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage settings"
  ON system_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default global settings
INSERT INTO system_settings (setting_key, setting_value, scope, description) VALUES
  ('service_level_target', '0.95', 'global', 'Target service level (95%)'),
  ('accelerator_up_percentage', '0.3', 'global', 'Accelerator UP threshold'),
  ('accelerator_down_percentage', '0.5', 'global', 'Accelerator DOWN threshold'),
  ('acceleration_idle_days', '3', 'global', 'Days between accelerations'),
  ('production_lead_time_global', '7', 'global', 'Production lead time (days)'),
  ('transport_lead_time_global', '3', 'global', 'Transport lead time (days)');

-- Helper function to get settings with scope hierarchy
CREATE OR REPLACE FUNCTION get_system_setting(
  p_setting_key text,
  p_location_code text DEFAULT NULL,
  p_sku text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value jsonb;
BEGIN
  -- Try SKU-specific first
  IF p_sku IS NOT NULL THEN
    SELECT setting_value INTO v_value FROM system_settings
    WHERE setting_key = p_setting_key AND scope = 'sku' AND scope_ref = p_sku LIMIT 1;
    IF v_value IS NOT NULL THEN RETURN v_value; END IF;
  END IF;
  
  -- Try location-specific
  IF p_location_code IS NOT NULL THEN
    SELECT setting_value INTO v_value FROM system_settings
    WHERE setting_key = p_setting_key AND scope = 'location' AND scope_ref = p_location_code LIMIT 1;
    IF v_value IS NOT NULL THEN RETURN v_value; END IF;
  END IF;
  
  -- Fall back to global
  SELECT setting_value INTO v_value FROM system_settings
  WHERE setting_key = p_setting_key AND scope = 'global' LIMIT 1;
  
  RETURN v_value;
END;
$$;