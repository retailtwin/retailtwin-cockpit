
-- Create indexes for DBM queries
CREATE INDEX IF NOT EXISTS idx_fact_daily_location_sku_date 
ON aifo.fact_daily(location_code, sku, d);

CREATE INDEX IF NOT EXISTS idx_fact_daily_target_units 
ON aifo.fact_daily(target_units) WHERE target_units IS NOT NULL;

-- Create DBM daily metrics view
CREATE OR REPLACE VIEW aifo.v_dbm_daily_metrics AS
SELECT 
    location_code,
    sku,
    d,
    on_hand_units,
    on_order_units,
    in_transit_units,
    units_sold,
    target_units,
    economic_units,
    economic_overstock_units,
    -- Calculated fields
    CASE 
        WHEN target_units IS NULL THEN 'unknown'
        WHEN on_hand_units > target_units THEN 'overstock'
        WHEN on_hand_units <= target_units AND on_hand_units > (target_units * 2.0/3.0) THEN 'green'
        WHEN on_hand_units <= (target_units * 2.0/3.0) AND on_hand_units > (target_units * 1.0/3.0) THEN 'yellow'
        ELSE 'red'
    END as dbm_zone,
    CASE 
        WHEN target_units IS NOT NULL THEN economic_units - target_units
        ELSE NULL
    END as economic_balance
FROM aifo.fact_daily;

-- Create DBM summary statistics view
CREATE OR REPLACE VIEW aifo.v_dbm_summary_stats AS
SELECT 
    COUNT(*) as total_records,
    COUNT(target_units) as records_with_target,
    COUNT(DISTINCT location_code) as locations,
    COUNT(DISTINCT sku) as skus,
    MIN(d) as earliest_date,
    MAX(d) as latest_date,
    AVG(target_units)::numeric(10,2) as avg_target,
    AVG(economic_units)::numeric(10,2) as avg_economic,
    SUM(CASE WHEN on_hand_units > target_units THEN 1 ELSE 0 END) as overstock_days,
    SUM(CASE WHEN on_hand_units = 0 THEN 1 ELSE 0 END) as stockout_days
FROM aifo.fact_daily
WHERE target_units IS NOT NULL;

COMMENT ON VIEW aifo.v_dbm_daily_metrics IS 'Daily DBM metrics showing inventory zones and economic balance';
COMMENT ON VIEW aifo.v_dbm_summary_stats IS 'Summary statistics for DBM system performance monitoring';
