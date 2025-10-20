-- Create AIFO schema
CREATE SCHEMA IF NOT EXISTS aifo;

-- Locations table
CREATE TABLE IF NOT EXISTS aifo.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT
);

-- Products table
CREATE TABLE IF NOT EXISTS aifo.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT,
  unit_cost NUMERIC,
  unit_price NUMERIC,
  target_max_units NUMERIC
);

-- Fact daily table
CREATE TABLE IF NOT EXISTS aifo.fact_daily (
  id BIGSERIAL PRIMARY KEY,
  d DATE NOT NULL,
  location_code TEXT NOT NULL,
  sku TEXT NOT NULL,
  units_sold NUMERIC NOT NULL,
  on_hand_units NUMERIC,
  on_order_units NUMERIC,
  in_transit_units NUMERIC,
  on_hand_units_sim NUMERIC
);

-- KPI current view
CREATE OR REPLACE VIEW aifo.kpi_current AS
WITH base AS (
  SELECT
    f.location_code,
    f.sku,
    COUNT(*)::INT AS days_total,
    SUM(f.units_sold) AS units_sold,
    AVG(f.on_hand_units) AS avg_on_hand,
    AVG(f.on_hand_units_sim) AS avg_on_hand_sim,
    COUNT(*) FILTER (WHERE f.on_hand_units = 0) AS stockout_days,
    COUNT(*) FILTER (WHERE f.on_hand_units_sim = 0) AS stockout_days_sim
  FROM aifo.fact_daily f
  GROUP BY f.location_code, f.sku
),
price AS (
  SELECT sku, unit_price, unit_cost, (unit_price - unit_cost) AS tpu FROM aifo.products
)
SELECT
  b.location_code, b.sku, b.days_total,
  b.units_sold, b.avg_on_hand, b.avg_on_hand_sim,
  b.stockout_days, b.stockout_days_sim,
  GREATEST(0, 1 - (b.stockout_days::NUMERIC / NULLIF(b.days_total,0))) AS service_level,
  p.unit_price, p.unit_cost, p.tpu,
  b.units_sold * p.tpu AS tcm,
  CASE WHEN b.days_total>0 AND b.avg_on_hand>0
       THEN (b.units_sold / b.avg_on_hand) * (365.0 / b.days_total)
       ELSE NULL END AS turns_current,
  CASE WHEN b.days_total>0 AND b.avg_on_hand_sim>0
       THEN (b.units_sold / b.avg_on_hand_sim) * (365.0 / b.days_total)
       ELSE NULL END AS turns_sim,
  CASE WHEN (1 - (b.stockout_days::NUMERIC / NULLIF(b.days_total,0))) > 0
       THEN FLOOR((b.units_sold / (1 - (b.stockout_days::NUMERIC / b.days_total))) - b.units_sold)
       ELSE NULL END AS missed_units,
  CASE WHEN (1 - (b.stockout_days::NUMERIC / NULLIF(b.days_total,0))) > 0
       THEN FLOOR((b.units_sold / (1 - (b.stockout_days::NUMERIC / b.days_total))) - b.units_sold) * p.tpu
       ELSE NULL END AS mtv
FROM base b
JOIN price p ON p.sku = b.sku;

-- Enable RLS for all tables
ALTER TABLE aifo.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aifo.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE aifo.fact_daily ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (since this is a demo/analytics app)
CREATE POLICY "Allow public read access to locations" ON aifo.locations FOR SELECT USING (true);
CREATE POLICY "Allow public read access to products" ON aifo.products FOR SELECT USING (true);
CREATE POLICY "Allow public read access to fact_daily" ON aifo.fact_daily FOR SELECT USING (true);