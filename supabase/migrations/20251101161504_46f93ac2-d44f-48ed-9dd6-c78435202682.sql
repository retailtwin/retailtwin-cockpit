-- Add new system settings for enhanced configuration
-- Use INSERT with manual conflict handling

-- Insert shipping_lead_time if not exists
INSERT INTO system_settings (setting_key, setting_value, scope, description)
SELECT 'shipping_lead_time', '3', 'global', 'Shipping/transport lead time in days'
WHERE NOT EXISTS (
  SELECT 1 FROM system_settings WHERE setting_key = 'shipping_lead_time' AND scope = 'global' AND scope_ref IS NULL
);

-- Insert order_days if not exists
INSERT INTO system_settings (setting_key, setting_value, scope, description)
SELECT 'order_days', '5', 'global', 'Number of days between orders'
WHERE NOT EXISTS (
  SELECT 1 FROM system_settings WHERE setting_key = 'order_days' AND scope = 'global' AND scope_ref IS NULL
);

-- Insert minimum_stock_threshold if not exists
INSERT INTO system_settings (setting_key, setting_value, scope, description)
SELECT 'minimum_stock_threshold', '1', 'global', 'Minimum stock level for alerts'
WHERE NOT EXISTS (
  SELECT 1 FROM system_settings WHERE setting_key = 'minimum_stock_threshold' AND scope = 'global' AND scope_ref IS NULL
);

-- Insert dynamic_period if not exists
INSERT INTO system_settings (setting_key, setting_value, scope, description)
SELECT 'dynamic_period', 'true', 'global', 'Auto-detect active stock period'
WHERE NOT EXISTS (
  SELECT 1 FROM system_settings WHERE setting_key = 'dynamic_period' AND scope = 'global' AND scope_ref IS NULL
);

-- Insert start_of_day_stock if not exists
INSERT INTO system_settings (setting_key, setting_value, scope, description)
SELECT 'start_of_day_stock', 'true', 'global', 'Use stock values from start of day'
WHERE NOT EXISTS (
  SELECT 1 FROM system_settings WHERE setting_key = 'start_of_day_stock' AND scope = 'global' AND scope_ref IS NULL
);

-- Insert dynamic_initial_target if not exists
INSERT INTO system_settings (setting_key, setting_value, scope, description)
SELECT 'dynamic_initial_target', 'true', 'global', 'Use calculated targets vs current on-hand'
WHERE NOT EXISTS (
  SELECT 1 FROM system_settings WHERE setting_key = 'dynamic_initial_target' AND scope = 'global' AND scope_ref IS NULL
);

-- Insert unhide_features if not exists
INSERT INTO system_settings (setting_key, setting_value, scope, description)
SELECT 'unhide_features', 'false', 'global', 'Show/hide advanced features'
WHERE NOT EXISTS (
  SELECT 1 FROM system_settings WHERE setting_key = 'unhide_features' AND scope = 'global' AND scope_ref IS NULL
);

-- Insert show_skulocdate_data if not exists
INSERT INTO system_settings (setting_key, setting_value, scope, description)
SELECT 'show_skulocdate_data', 'false', 'global', 'Display detailed calculation data'
WHERE NOT EXISTS (
  SELECT 1 FROM system_settings WHERE setting_key = 'show_skulocdate_data' AND scope = 'global' AND scope_ref IS NULL
);

-- Update existing settings with new defaults
UPDATE system_settings 
SET setting_value = '0.4', description = 'UP percentage - increase target when avg weekly sales reaches threshold'
WHERE setting_key = 'accelerator_up_percentage' AND scope = 'global' AND scope_ref IS NULL;

UPDATE system_settings 
SET setting_value = '0.2', description = 'DOWN percentage - decrease target when avg weekly sales drops below threshold'
WHERE setting_key = 'accelerator_down_percentage' AND scope = 'global' AND scope_ref IS NULL;