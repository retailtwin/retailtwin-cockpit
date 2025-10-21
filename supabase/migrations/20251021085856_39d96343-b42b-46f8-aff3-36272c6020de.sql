-- Add missing columns to aifo.locations
ALTER TABLE aifo.locations 
ADD COLUMN IF NOT EXISTS production_lead_time INTEGER,
ADD COLUMN IF NOT EXISTS shipping_lead_time INTEGER,
ADD COLUMN IF NOT EXISTS order_days TEXT;

-- Add missing columns to aifo.products
ALTER TABLE aifo.products 
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC,
ADD COLUMN IF NOT EXISTS unit_price NUMERIC,
ADD COLUMN IF NOT EXISTS target_max_units INTEGER;

-- Add missing columns to aifo.fact_daily
ALTER TABLE aifo.fact_daily
ADD COLUMN IF NOT EXISTS on_order_units INTEGER,
ADD COLUMN IF NOT EXISTS in_transit_units INTEGER;

-- Insert location data
INSERT INTO aifo.locations (code, name, production_lead_time, shipping_lead_time, order_days)
VALUES ('98274', 'Store 98274', 0, 5, 'mon,tue,wed,thu,fri,sat,sun')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  production_lead_time = EXCLUDED.production_lead_time,
  shipping_lead_time = EXCLUDED.shipping_lead_time,
  order_days = EXCLUDED.order_days;

-- Clear existing products and insert new data
TRUNCATE TABLE aifo.products CASCADE;

INSERT INTO aifo.products (sku, name, unit_cost, unit_price, target_max_units) VALUES
('9004897532362', '18076 - 7005 Special 15 Tights black S', 15.9, 35, NULL),
('9004897537107', '18076 - 4365 Special 15 Tights accona M', 15.9, 35, NULL),
('9004897941560', '11310 - 1051 Vicuna Tights ecrue M', 25.0, 55, NULL),
('9004897941782', '11310 - 7005 Vicuna Tights black S', 25.0, 55, NULL),
('9002839398786', '11415 - 7005 Silken de Luxe Tights black M', 25.0, 55, NULL),
('9002839690941', '31206 - 5280 Silken Touch 20 Knee-Highs admiral M', 11.35, 25, NULL),
('9008731023764', '45001 - 5280 Fabric Silken Socks admiral 4344', 13.65, 30, NULL),
('9008731023788', '45001 - 5280 Fabric Silken Socks admiral 4546', 13.65, 30, NULL),
('9008133933029', '11218 - 4365 Miss W 30 leg support Tights accona L', 20.45, 45, NULL),
('9008133933005', '11218 - 4365 Miss W 30 leg support Tights accona M', 20.45, 45, NULL),
('9002839677829', '30923 - 5280 Silken de Luxe 50 Knee-Highs admiral S', 11.35, 25, NULL),
('9002839691221', '31206 - 7212 Silken Touch 20 Knee-Highs nearly black S', 11.35, 25, NULL),
('9002839691023', '31206 - 7005 Silken Touch 20 Knee-Highs black S', 11.35, 25, NULL),
('9006682859340', '18267 - 4365 Single 20 Tights accona S', 15.9, 35, NULL),
('9006682859982', '18267 - 7005 Single 20 Tights black L', 15.9, 35, NULL),
('9008133338862', '31241 - 4273 Single 10 Knee-Highs cosmetic M', 11.35, 25, NULL),
('9009752140645', '31241 - 4738 Single 10 Knee-Highs fairly light S', 11.35, 25, NULL),
('9008133627744', '18379 - 7212 Silken Opaque 50 Tights nearly black S', 15.9, 35, NULL),
('9008133627669', '18379 - 7005 Silken Opaque 50 Tights black L', 15.9, 35, NULL),
('9008133560126', '31248 - 7005 Angelic Energy 30 Leg Vitalizer black S', 15.9, 35, NULL),
('9008133852801', '18391 - 7005 Shining 40 Tights black XS', 15.9, 35, NULL),
('9008133936167', '21646 - 7005 Single 12 Stay-Hip black M', 25.0, 55, NULL),
('9008477433780', '18517 - 7005 Middle 20 control top Tights black S', 20.45, 45, NULL),
('9008477470228', '18517 - 4365 Middle 20 control top Tights accona M', 20.45, 45, NULL),
('9009101420404', '79042 - 4545 Tulle Forming String Body nude 36', 53.88, 132, NULL),
('9009101930064', '14434 - 7005 Angelic 50 Tights black XS', 20.45, 45, NULL),
('9009752128704', '41531 - 4736 Fabric Footsies Socks sisal S', 6.8, 15, NULL),
('9009752170642', '41260 - 7005 Single 10 Socks black S', 9.1, 20, NULL),
('9009752170321', '41260 - 4365 Single 10 Socks accona S', 9.1, 20, NULL),
('9009752339308', '10272 - 4365 Nude 8 Tights accona XS', 13.2, 29, NULL),
('9009752339087', '10272 - 4060 Nude 8 Tights honey S', 13.2, 29, NULL),
('9009752339322', '10272 - 4365 Nude 8 Tights accona S', 13.2, 29, NULL),
('9009752400282', '14554 - 7005 Perfect Fit Leggings black S', 72.75, 160, NULL),
('9009752457200', '69728 - 7005 Fabric Contour 3W Skin Bra black 75C', 53.88, 132, NULL),
('9009752736466', '14669 - 7005 Middle 66 Control Top Tights black XL', 27.25, 60, NULL),
('9009752929905', '14732 - 4365 Angelic Shimmer 40 Concealer Tigh accona XS', 22.75, 50, NULL),
('9009752929929', '14732 - 4365 Angelic Shimmer 40 Concealer Tigh accona S', 22.75, 50, NULL),
('9009752930420', '14732 - 7005 Angelic Shimmer 40 Concealer Tigh black M', 22.75, 50, NULL),
('9009752945660', '69839 - 7005 Angelic Panty black S', 25.31, 62, NULL);