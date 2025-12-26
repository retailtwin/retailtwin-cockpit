// types.ts - DBM 3.0 Type Definitions
// Updated: Added date tracking fields for stock activity validation

export interface SkuLocDate {
  day: string;
  location_code: string;
  sku: string;
  company_id: string;
  dataset_id?: string;
  units_sold: number;
  on_hand_units: number;
  on_order_units: number;
  in_transit_units: number;
  on_hand_units_sim: number;
  on_order_units_sim: number;
  in_transit_units_sim: number;
  target_units: number;
  dbm_zone: string | null;
  dbm_zone_previous: string | null;
  red_threshold: number;
  yellow_threshold: number;
  counter_red: number;
  counter_green: number;
  counter_yellow: number;
  counter_overstock: number;
  stockout_days: number;
  decision: string | null;
  last_accelerated: string | null;
  accelerator_condition: string | null;
  safety_level: number;
  lead_time: number;
  frozen: boolean;
  state: string | null;
  // NEW: Date tracking fields for stock activity validation (matches C# reference)
  last_out_of_red: string | null;      // When SKU last exited red zone
  last_increase: string | null;         // When target was last increased
  last_decrease: string | null;         // When target was last decreased
  last_manual: string | null;           // When last manual intervention occurred
  last_non_overstock: string | null;    // When SKU was last not in overstock
}

export interface Order {
  sku: string;
  location_code: string;
  company_id: string;
  units_ordered: number;
  units_on_order: number;
  units_in_transit: number;
  creation_date: string;
  move_to_transit_date: string;
  receive_date: string;
  is_received: boolean;
}

export interface Settings {
  production_lead_time: number;
  shipping_lead_time: number;
  red_zone_percentage: number;
  yellow_zone_percentage: number;
  overstock_threshold: number;
  accelerator_up_percentage: number;
  accelerator_down_percentage: number;
  acceleration_idle_days: number;
  accelerator_minimum_target: number;
  min_order_qty: number;
  order_multiple: number;
  // NEW: Order days setting (e.g., "mon,thu" or empty for daily)
  order_days: string;
  // NEW: Dynamic period setting (count from first inventory date)
  dynamic_period: boolean;
  // PLACEHOLDER: Dynamic initial target (parked for future implementation)
  dynamic_initial_target: boolean;
}

export interface SimulationRequest {
  company_id: string;
  location_code?: string;
  sku?: string;
  start_date: string;
  end_date: string;
}

export interface SkuLocationKPIs {
  sku: string;
  location_code: string;
  simulation_days: number;
  stockout_days: number;
  service_level: number;
  total_units_sold: number;
  sum_daily_inventory: number;
  average_inventory: number;
  inventory_turns_annualized: number;
  days_to_cash: number | null;
  has_stock_on_last_day: boolean;
  orders_placed: number;
  buffer_increases: number;
  buffer_decreases: number;
  final_target: number;
  days_in_red: number;
  days_in_yellow: number;
  days_in_green: number;
  days_in_overstock: number;
  // NEW: Actual simulation days for this SKU (may differ from global if dynamic_period)
  active_days?: number;
  first_activity_date?: string;
}

export interface KPIs {
  service_level: number;
  total_simulation_days: number;
  total_stockout_days: number;
  fill_rate: number;
  sku_locs_with_stock: number;
  sku_locs_total: number;
  snapshot_date: string;
  inventory_turns_annualized: number;
  days_to_cash: number | null;
  total_units_sold: number;
  average_inventory: number;
}

export interface SimulationResult {
  processed_days: number;
  sku_locations: number;
  orders_created: number;
  buffer_increases: number;
  buffer_decreases: number;
  errors: string[];
  kpis?: KPIs;
  by_sku_location?: SkuLocationKPIs[];
}
