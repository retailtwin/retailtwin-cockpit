export interface SkuLocDate {
  store_code: string;
  product_code: string;
  execution_date: string;
  
  // Inventory
  unit_on_hand: number;
  unit_on_order: number;
  unit_in_transit: number;
  unit_sales: number;
  
  // Settings
  lead_time: number;
  excluded_level: number;
  safety_level: number;
  
  // Responsiveness
  responsiveness_up_percentage: number;
  responsiveness_down_percentage: number;
  responsiveness_idle_days: number;
  average_weekly_sales_units: number;
  
  // Accelerator magnitude controls
  accelerator_up_multiplier?: number;
  accelerator_down_multiplier?: number;
  
  // Safety guards
  accelerator_requires_inventory?: boolean;
  accelerator_minimum_target?: number;
  accelerator_enable_zero_sales?: boolean;
  
  // Calculated
  green?: number; // target_units
  yellow: number;
  red: number;
  dbm_zone: string;
  dbm_zone_previous: string;
  
  // Counters
  counter_green: number;
  counter_yellow: number;
  counter_red: number;
  counter_overstock: number;
  
  // States
  decision: string;
  frozen: boolean;
  state: string;
  
  // Dates
  last_accelerated: string;
  last_decrease: string;
  last_increase: string;
  last_manual: string;
  last_non_overstock: string;
  last_out_of_red: string;
  
  // Economic
  units_economic: number;
  units_economic_overstock: number;
  units_economic_understock: number;
  
  // Optional
  accelerator_condition?: string;
  accelerator_info?: string;
}

export interface DBMSettings {
  accelerator_up_percentage: number;
  accelerator_down_percentage: number;
  acceleration_idle_days: number;
}
