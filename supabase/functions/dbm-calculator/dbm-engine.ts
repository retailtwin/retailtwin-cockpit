// dbm-engine.ts - DBM 3.0 Algorithm Implementation
// Version: 2025-12-27 v7 - Simplified, production-ready
// 
// CORE PRINCIPLE: Start where you are, optimize from reality.
//   - Initial target = current on-hand (always)
//   - No theoretical calculations for starting position
//
// TWO SIGNALS:
//   1. Inventory (zone-based): Has supply chain proven it can respond?
//   2. Sales (responsiveness): Is demand pattern changing?
//
// Together: Simple, trustworthy, scalable.

// ============================================================================
// TYPES
// ============================================================================

export interface DBMSettings {
  lead_time: number;                    // Days to wait before adjustments (default: 3)
  responsiveness_up_percentage: number; // Threshold for increase (default: 0.4 = 40%)
  responsiveness_down_percentage: number; // Threshold for decrease (default: 0.2 = 20%)
  responsiveness_idle_days: number;     // Cooldown between responsiveness adjustments (default: 3)
}

export interface SkuLocDay {
  // Identity
  sku_loc_key: string;
  day: string;                          // ISO date string YYYY-MM-DD
  
  // Input data
  on_hand_units: number;                // Current inventory
  average_weekly_sales_units: number;   // Rolling average (calculated externally)
  
  // DBM state (persisted between days)
  target_units: number;                 // The "Green" buffer level
  yellow_threshold: number;             // Calculated from target
  red_threshold: number;                // Calculated from target
  dbm_zone: string;                     // 'overstock' | 'green' | 'yellow' | 'red'
  dbm_zone_previous: string | null;     // Previous day's zone
  
  // Counters
  counter_green: number;                // Days in green/overstock
  counter_red: number;                  // Days in red
  
  // Tracking dates
  last_out_of_red: string | null;       // Last date exited red zone
  last_non_overstock: string | null;    // Last date NOT in overstock (null when in overstock)
  last_decrease: string | null;         // Last zone-based decrease
  last_accelerated: string | null;      // Last responsiveness adjustment
  
  // Output
  decision: string | null;              // What action was taken
}

const DEFAULT_DATE = '2000-01-01';

// ============================================================================
// DBM ENGINE
// ============================================================================

export class DBMEngine {
  private settings: DBMSettings;

  constructor(settings?: Partial<DBMSettings>) {
    this.settings = {
      lead_time: settings?.lead_time ?? 3,
      responsiveness_up_percentage: settings?.responsiveness_up_percentage ?? 0.4,
      responsiveness_down_percentage: settings?.responsiveness_down_percentage ?? 0.2,
      responsiveness_idle_days: settings?.responsiveness_idle_days ?? 3,
    };
  }

  // --------------------------------------------------------------------------
  // MAIN ENTRY POINT
  // --------------------------------------------------------------------------

  /**
   * Initialize a new SKU-Location on Day 1
   * Initial target = current on-hand (always)
   */
  public initializeDay1(sku_loc_key: string, day: string, on_hand_units: number): SkuLocDay {
    const target = on_hand_units;  // Always start with current on-hand
    const { yellow, red } = this.calculateThresholds(target);
    const zone = this.calculateZone(on_hand_units, target, yellow, red);
    
    return {
      sku_loc_key,
      day,
      on_hand_units,
      average_weekly_sales_units: 0,
      target_units: target,
      yellow_threshold: yellow,
      red_threshold: red,
      dbm_zone: zone,
      dbm_zone_previous: null,
      counter_green: zone === 'green' || zone === 'overstock' ? 1 : 0,
      counter_red: zone === 'red' ? 1 : 0,
      last_out_of_red: zone !== 'red' ? day : null,
      last_non_overstock: zone !== 'overstock' ? day : null,
      last_decrease: null,
      last_accelerated: null,
      decision: 'init',
    };
  }

  /**
   * Process a single day's DBM calculation
   * Call this for Day 2 onwards
   */
  public processDay(
    previous: SkuLocDay,
    day: string,
    on_hand_units: number,
    average_weekly_sales_units: number
  ): SkuLocDay {
    // Start with previous state
    const sld: SkuLocDay = {
      ...previous,
      day,
      on_hand_units,
      average_weekly_sales_units,
      dbm_zone_previous: previous.dbm_zone,
      decision: null,
    };

    // Step 1: Calculate zone with current target
    const { yellow, red } = this.calculateThresholds(sld.target_units);
    sld.yellow_threshold = yellow;
    sld.red_threshold = red;
    sld.dbm_zone = this.calculateZone(on_hand_units, sld.target_units, yellow, red);

    // Step 2: Update tracking dates
    this.updateTrackingDates(sld);

    // Step 3: Update counters
    this.updateCounters(sld);

    // Step 4: Zone-based adjustments (inventory signal)
    this.applyZoneBasedAdjustments(sld);

    // Step 5: Responsiveness adjustments (sales signal)
    this.applyResponsivenessAdjustments(sld);

    // Step 6: Recalculate thresholds if target changed
    if (sld.decision) {
      const newThresholds = this.calculateThresholds(sld.target_units);
      sld.yellow_threshold = newThresholds.yellow;
      sld.red_threshold = newThresholds.red;
      // Recalculate zone after target change
      sld.dbm_zone = this.calculateZone(on_hand_units, sld.target_units, newThresholds.yellow, newThresholds.red);
    }

    // Step 7: Set default decision if no action taken
    if (!sld.decision) {
      sld.decision = this.getDefaultDecision(sld.dbm_zone);
    }

    return sld;
  }

  // --------------------------------------------------------------------------
  // THRESHOLD CALCULATIONS
  // --------------------------------------------------------------------------

  private calculateThresholds(target: number): { yellow: number; red: number } {
    if (target <= 2) {
      return { yellow: 1, red: 1 };
    }
    const red = Math.ceil(target / 3);
    const yellow = red * 2;
    return { yellow, red };
  }

  private calculateZone(onHand: number, target: number, yellow: number, red: number): string {
    if (onHand > target) return 'overstock';
    if (onHand > yellow) return 'green';
    if (onHand > red) return 'yellow';
    return 'red';
  }

  // --------------------------------------------------------------------------
  // TRACKING DATES
  // --------------------------------------------------------------------------

  private updateTrackingDates(sld: SkuLocDay): void {
    // last_out_of_red: Set when exiting red zone
    if (sld.dbm_zone_previous === 'red' && sld.dbm_zone !== 'red' && sld.target_units > 1) {
      sld.last_out_of_red = sld.day;
    }
    // Initialize on Day 1 equivalent (first time not in red)
    if (!sld.last_out_of_red && sld.dbm_zone !== 'red' && sld.target_units > 1) {
      sld.last_out_of_red = sld.day;
    }

    // last_non_overstock: Track when NOT in overstock, clear when IN overstock
    if (sld.dbm_zone !== 'overstock' && sld.target_units > 1) {
      sld.last_non_overstock = sld.day;
    } else {
      sld.last_non_overstock = null;  // Clear when in overstock
    }
  }

  // --------------------------------------------------------------------------
  // COUNTERS
  // --------------------------------------------------------------------------

  private updateCounters(sld: SkuLocDay): void {
    if (sld.dbm_zone === 'green' || sld.dbm_zone === 'overstock') {
      sld.counter_green += 1;
      sld.counter_red = 0;
    } else if (sld.dbm_zone === 'red') {
      sld.counter_red += 1;
      sld.counter_green = 0;
    } else {
      // Yellow zone resets both
      sld.counter_green = 0;
      sld.counter_red = 0;
    }
  }

  // --------------------------------------------------------------------------
  // ZONE-BASED ADJUSTMENTS (Inventory Signal)
  // --------------------------------------------------------------------------

  private applyZoneBasedAdjustments(sld: SkuLocDay): void {
    const leadTime = this.settings.lead_time;

    // DECREASE: In green/overstock, counter exceeded, recently not in overstock
    if (sld.dbm_zone === 'green' || sld.dbm_zone === 'overstock') {
      const daysSinceNonOverstock = this.daysBetween(sld.day, sld.last_non_overstock);
      const daysSinceDecrease = this.daysBetween(sld.day, sld.last_decrease);

      if (
        sld.counter_green > leadTime &&
        daysSinceNonOverstock < leadTime &&
        daysSinceDecrease > leadTime &&
        sld.target_units > 1
      ) {
        const decrease = Math.ceil(sld.target_units / 3);
        sld.target_units = Math.max(1, sld.target_units - decrease);
        sld.counter_green = 0;  // Reset counter after decrease
        sld.last_decrease = sld.day;
        sld.decision = 'dec_from_green';
        
        // Recalculate zone after decrease
        const { yellow, red } = this.calculateThresholds(sld.target_units);
        sld.dbm_zone = this.calculateZone(sld.on_hand_units, sld.target_units, yellow, red);
        return;
      }
    }

    // INCREASE: In red, counter exceeded, recently exited red
    if (sld.dbm_zone === 'red') {
      const daysSinceOutOfRed = this.daysBetween(sld.day, sld.last_out_of_red);

      if (
        sld.counter_red > leadTime &&
        daysSinceOutOfRed < leadTime
      ) {
        const increase = Math.ceil(sld.target_units / 3);
        sld.target_units = sld.target_units + increase;
        sld.counter_red = 1;  // Reset to 1 after increase
        sld.decision = 'inc_from_red';
        
        // Recalculate zone after increase
        const { yellow, red } = this.calculateThresholds(sld.target_units);
        sld.dbm_zone = this.calculateZone(sld.on_hand_units, sld.target_units, yellow, red);
        return;
      }
    }
  }

  // --------------------------------------------------------------------------
  // RESPONSIVENESS ADJUSTMENTS (Sales Signal)
  // --------------------------------------------------------------------------

  private applyResponsivenessAdjustments(sld: SkuLocDay): void {
    // Skip if zone-based adjustment already happened
    if (sld.decision) return;

    const daysSinceAccelerated = this.daysBetween(sld.day, sld.last_accelerated);
    
    // Must wait for cooldown period
    if (daysSinceAccelerated <= this.settings.responsiveness_idle_days) return;
    
    // Must have observed sales (can't respond to unobserved demand)
    if (sld.average_weekly_sales_units <= 0) return;

    const target = sld.target_units;
    const avgSales = sld.average_weekly_sales_units;

    // INCREASE: Sales velocity high relative to target
    // Condition: AvgWeeklySales >= up_percentage * Target
    // Executes in ALL zones
    const upThreshold = this.settings.responsiveness_up_percentage * target;
    if (avgSales >= upThreshold) {
      sld.target_units = target + Math.ceil(avgSales);
      sld.last_accelerated = sld.day;
      sld.decision = 'increase';
      return;
    }

    // DECREASE: Sales velocity low relative to target
    // Condition: AvgWeeklySales < down_percentage * Target
    // ONLY executes in GREEN zone, floor at 2
    if (sld.dbm_zone === 'green' && target > 2) {
      const downThreshold = this.settings.responsiveness_down_percentage * target;
      if (avgSales < downThreshold) {
        const decrease = Math.ceil(target / 3);
        sld.target_units = Math.max(2, target - decrease);
        sld.last_accelerated = sld.day;
        sld.decision = 'decrease';
        return;
      }
    }
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  private daysBetween(date1: string, date2: string | null): number {
    if (!date2) return 99999;  // Large number if no date set
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getDefaultDecision(zone: string): string {
    switch (zone) {
      case 'overstock': return 'overstock';
      case 'green': return 'green_count';
      case 'yellow': return 'yellow_count';
      case 'red': return 'red_count';
      default: return 'none';
    }
  }

  // --------------------------------------------------------------------------
  // BATCH PROCESSING
  // --------------------------------------------------------------------------

  /**
   * Process an entire time series for a SKU-Location
   * Input: Array of { day, on_hand_units, average_weekly_sales_units }
   * Output: Array of SkuLocDay with all DBM calculations
   */
  public processTimeSeries(
    sku_loc_key: string,
    data: Array<{ day: string; on_hand_units: number; average_weekly_sales_units: number }>
  ): SkuLocDay[] {
    if (data.length === 0) return [];

    const results: SkuLocDay[] = [];

    // Day 1: Initialize with on-hand
    const day1 = this.initializeDay1(sku_loc_key, data[0].day, data[0].on_hand_units);
    day1.average_weekly_sales_units = data[0].average_weekly_sales_units;
    results.push(day1);

    // Day 2+: Process each day
    for (let i = 1; i < data.length; i++) {
      const previous = results[i - 1];
      const current = this.processDay(
        previous,
        data[i].day,
        data[i].on_hand_units,
        data[i].average_weekly_sales_units
      );
      results.push(current);
    }

    return results;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createDBMEngine(settings?: Partial<DBMSettings>): DBMEngine {
  return new DBMEngine(settings);
}
