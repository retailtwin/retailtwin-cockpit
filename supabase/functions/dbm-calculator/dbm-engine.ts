// dbm-engine.ts - DBM 3.0 Algorithm Implementation
// Updated: Added date tracking and stock activity validation (matches C# reference)
import type { SkuLocDate, Settings, Order } from './types.ts';

export class DBMEngine {
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  /**
   * Check if the given date is a valid order day.
   * Based on C# SkuLoc.cs CreateOrder() method:
   *   string day_alias = _sld.ExecutionDate.DayOfWeek.ToString().ToLower().Substring(0, 3);
   *   is_order_day = OrderDays.Contains(day_alias) || string.IsNullOrEmpty(OrderDays);
   *
   * @param dateStr - The date string (YYYY-MM-DD)
   * @param orderDays - Comma-separated day aliases (e.g., "mon,thu") or empty for every day
   * @returns true if orders can be placed on this day
   */
  private isOrderDay(dateStr: string, orderDays: string): boolean {
    // If order_days is empty or not set, every day is an order day
    if (!orderDays || orderDays.trim() === '') {
      return true;
    }

    // Get the day of week as 3-letter alias (matching C# behavior)
    const dayAliases = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayAlias = dayAliases[dayOfWeek];

    // Check if this day is in the allowed order days (case-insensitive)
    return orderDays.toLowerCase().includes(dayAlias);
  }

  processDay(
    current: SkuLocDate,
    previous: SkuLocDate | null,
    orders: Order[],
    currentDate: string
  ): { state: SkuLocDate; newOrder: Order | null } {

    const state: SkuLocDate = { ...current };

    if (previous) {
      state.on_hand_units_sim = previous.on_hand_units_sim;
      state.on_order_units_sim = previous.on_order_units_sim;
      state.in_transit_units_sim = previous.in_transit_units_sim;
      state.target_units = previous.target_units;
      state.counter_red = previous.counter_red;
      state.counter_green = previous.counter_green;
      state.counter_yellow = previous.counter_yellow;
      state.counter_overstock = previous.counter_overstock;
      state.stockout_days = previous.stockout_days;
      state.last_accelerated = previous.last_accelerated;
      state.dbm_zone_previous = previous.dbm_zone;
      state.safety_level = previous.safety_level;
      // NEW: Carry forward date tracking fields
      state.last_out_of_red = previous.last_out_of_red;
      state.last_increase = previous.last_increase;
      state.last_decrease = previous.last_decrease;
      state.last_manual = previous.last_manual;
      state.last_non_overstock = previous.last_non_overstock;
    } else {
      state.on_hand_units_sim = state.on_hand_units;
      state.on_order_units_sim = state.on_order_units;
      state.in_transit_units_sim = state.in_transit_units;
      // Initialize target from actual inventory if no target set
      if (state.target_units < this.settings.accelerator_minimum_target) {
        // Use actual on-hand as starting point, with minimum
        const initialTarget = Math.max(
          state.on_hand_units + state.on_order_units + state.in_transit_units,
          this.settings.accelerator_minimum_target
        );
        state.target_units = initialTarget;
      }
      // Initialize safety_level as percentage of target
      state.safety_level = Math.max(1, Math.floor(state.target_units * this.settings.red_zone_percentage));
      state.counter_red = 0;
      state.counter_green = 0;
      state.counter_yellow = 0;
      state.counter_overstock = 0;
      state.stockout_days = 0;
      state.dbm_zone_previous = null;
      // NEW: Initialize date tracking fields on first day
      state.last_out_of_red = null;
      state.last_increase = null;
      state.last_decrease = null;
      state.last_manual = null;
      state.last_non_overstock = currentDate; // Start as "not overstock"
    }

    this.processOrderArrivals(state, orders, currentDate);
    this.applyDailySales(state);
    this.calculateZones(state);
    this.determineZone(state);
    this.updateCounters(state);

    // NEW: Update date tracking based on zone transitions
    this.updateDateTracking(state, currentDate);

    const decision = this.getDecision(state, currentDate);
    state.decision = decision;

    if (decision === 'increase' || decision === 'decrease') {
      this.adjustBuffer(state, decision === 'increase', currentDate);
    }

    let newOrder: Order | null = null;
    if (decision === 'order') {
      // NEW: Check if today is a valid order day before creating order
      if (this.isOrderDay(currentDate, this.settings.order_days)) {
        newOrder = this.createOrder(state, currentDate);
        if (newOrder && newOrder.units_ordered > 0) {
          state.on_order_units_sim += newOrder.units_ordered;
        }
      } else {
        // Not an order day - change decision to 'maintain' (wait for next order day)
        state.decision = 'maintain';
      }
    }

    return { state, newOrder };
  }

  /**
   * NEW: Update date tracking fields based on zone transitions
   * Matches C# reference GetLastOutOfRed(), GetLastNonOverstock() logic
   */
  private updateDateTracking(state: SkuLocDate, currentDate: string): void {
    const previousZone = state.dbm_zone_previous;
    const currentZone = state.dbm_zone;

    // Track when exiting red zone (C# GetLastOutOfRed logic)
    // Update last_out_of_red when transitioning FROM red TO any other zone
    if (previousZone === 'red' && currentZone !== 'red') {
      state.last_out_of_red = currentDate;
    }

    // Track when NOT in overstock (C# GetLastNonOverstock logic)
    // Update last_non_overstock whenever we're not in overstock
    if (currentZone !== 'overstock') {
      state.last_non_overstock = currentDate;
    }
  }

  private processOrderArrivals(state: SkuLocDate, orders: Order[], currentDate: string): void {
    const skuOrders = orders.filter(
      o => o.sku === state.sku &&
           o.location_code === state.location_code &&
           !o.is_received
    );

    for (const order of skuOrders) {
      if (order.move_to_transit_date === currentDate && order.units_on_order > 0) {
        state.on_order_units_sim -= order.units_on_order;
        state.in_transit_units_sim += order.units_on_order;
        order.units_in_transit = order.units_on_order;
        order.units_on_order = 0;
      }

      if (order.receive_date === currentDate && order.units_in_transit > 0) {
        state.in_transit_units_sim -= order.units_in_transit;
        state.on_hand_units_sim += order.units_in_transit;
        order.units_in_transit = 0;
        order.is_received = true;
      }
    }

    state.on_order_units_sim = Math.max(0, state.on_order_units_sim);
    state.in_transit_units_sim = Math.max(0, state.in_transit_units_sim);
  }

  private applyDailySales(state: SkuLocDate): void {
    state.on_hand_units_sim = Math.max(0, state.on_hand_units_sim - state.units_sold);
    if (state.on_hand_units_sim === 0) {
      state.stockout_days += 1;
    }
  }

  private calculateZones(state: SkuLocDate): void {
    const green = state.target_units;
    state.red_threshold = Math.floor(green * this.settings.red_zone_percentage);
    state.yellow_threshold = Math.floor(green * this.settings.yellow_zone_percentage);
  }

  private determineZone(state: SkuLocDate): void {
    const stock = state.on_hand_units_sim;

    if (stock <= state.red_threshold) {
      state.dbm_zone = 'red';
    } else if (stock <= state.yellow_threshold) {
      state.dbm_zone = 'yellow';
    } else if (stock > state.target_units * this.settings.overstock_threshold) {
      state.dbm_zone = 'overstock';
    } else {
      state.dbm_zone = 'green';
    }
  }

  private updateCounters(state: SkuLocDate): void {
    if (state.dbm_zone !== 'red') state.counter_red = 0;
    if (state.dbm_zone !== 'green') state.counter_green = 0;
    if (state.dbm_zone !== 'yellow') state.counter_yellow = 0;
    if (state.dbm_zone !== 'overstock') state.counter_overstock = 0;

    switch (state.dbm_zone) {
      case 'red': state.counter_red += 1; break;
      case 'green': state.counter_green += 1; break;
      case 'yellow': state.counter_yellow += 1; break;
      case 'overstock': state.counter_overstock += 1; break;
    }
  }

  /**
   * CORRECTED Decision Logic (per C# reference DBM.cs GetGreen())
   * 
   * RED zone INCREASE conditions (C# lines 404-412):
   *   1. counter_red > lead_time
   *   2. zone === 'red'
   *   3. days since last_out_of_red < lead_time (recent red exit = valid increase)
   * 
   * GREEN zone DECREASE conditions (C# lines 368-402):
   *   1. counter_green > lead_time
   *   2. zone === 'green' or 'overstock'
   *   3. days since last_non_overstock < lead_time (recent stock activity)
   *   4. days since last_decrease > lead_time (cooldown between decreases)
   *   5. target > 1 (minimum floor)
   */
  private getDecision(state: SkuLocDate, currentDate: string): string {
    if (state.frozen) {
      return 'maintain';
    }

    const leadTime = state.lead_time;

    // RED ZONE LOGIC (matches C# GetGreen lines 404-412)
    if (state.dbm_zone === 'red') {
      // Check for buffer INCREASE
      const daysSinceOutOfRed = this.daysBetween(state.last_out_of_red, currentDate);
      
      // C# condition: counter > lead_time AND daysSinceOutOfRed < lead_time
      // The daysSinceOutOfRed < lead_time means: we recently exited red, then re-entered
      // This validates that the red zone is "real" (not just startup noise)
      if (state.counter_red > leadTime && daysSinceOutOfRed < leadTime) {
        return 'increase';
      }
      
      // Check for ORDER (at or below safety level)
      if (state.on_hand_units_sim <= state.safety_level) {
        return 'order';
      }
      return 'maintain';
    }

    // GREEN/OVERSTOCK ZONE LOGIC (matches C# GetGreen lines 368-402)
    if (state.dbm_zone === 'green' || state.dbm_zone === 'overstock') {
      // Check for buffer DECREASE
      const daysSinceNonOverstock = this.daysBetween(state.last_non_overstock, currentDate);
      const daysSinceLastDecrease = this.daysBetween(state.last_decrease, currentDate);
      
      // C# conditions for decrease:
      // 1. counter_green > lead_time (been in green long enough)
      // 2. daysSinceNonOverstock < lead_time (recent stock activity validates decrease)
      // 3. daysSinceLastDecrease > lead_time (cooldown between decreases)
      // 4. target > 1 (don't decrease below minimum)
      if (
        state.counter_green > leadTime &&
        daysSinceNonOverstock < leadTime &&
        daysSinceLastDecrease > leadTime &&
        state.target_units > 1
      ) {
        return 'decrease';
      }
    }

    return 'maintain';
  }

  private adjustBuffer(state: SkuLocDate, isIncrease: boolean, currentDate: string): void {
    const currentTarget = state.target_units;
    let newTarget: number;

    if (isIncrease) {
      const factor = 1 + this.settings.accelerator_up_percentage;
      newTarget = Math.ceil(currentTarget * factor);
      const maxIncrease = Math.ceil(currentTarget * 1.5);
      newTarget = Math.min(newTarget, maxIncrease);
      state.accelerator_condition = 'INCREASED';
      // NEW: Track when increase happened
      state.last_increase = currentDate;
    } else {
      const factor = 1 - this.settings.accelerator_down_percentage;
      newTarget = Math.floor(currentTarget * factor);
      const floor = Math.max(state.safety_level, this.settings.accelerator_minimum_target);
      newTarget = Math.max(newTarget, floor);
      state.accelerator_condition = 'DECREASED';
      // NEW: Track when decrease happened
      state.last_decrease = currentDate;
    }

    state.target_units = newTarget;
    state.last_accelerated = currentDate;

    // Update safety_level proportionally
    state.safety_level = Math.max(1, Math.floor(newTarget * this.settings.red_zone_percentage));

    this.calculateZones(state);
  }

  private createOrder(state: SkuLocDate, currentDate: string): Order | null {
    const totalPipeline = state.on_hand_units_sim + state.on_order_units_sim + state.in_transit_units_sim;
    let orderQty = state.target_units - totalPipeline;

    orderQty = Math.max(orderQty, this.settings.min_order_qty);

    if (this.settings.order_multiple > 1) {
      orderQty = Math.ceil(orderQty / this.settings.order_multiple) * this.settings.order_multiple;
    }

    if (orderQty <= 0) {
      return null;
    }

    const totalLeadTime = this.settings.production_lead_time + this.settings.shipping_lead_time;
    const moveToTransitDate = this.addDays(currentDate, this.settings.production_lead_time);
    const receiveDate = this.addDays(currentDate, totalLeadTime);

    return {
      sku: state.sku,
      location_code: state.location_code,
      company_id: state.company_id,
      units_ordered: orderQty,
      units_on_order: orderQty,
      units_in_transit: 0,
      creation_date: currentDate,
      move_to_transit_date: moveToTransitDate,
      receive_date: receiveDate,
      is_received: false,
    };
  }

  private daysBetween(date1: string | null, date2: string): number {
    if (!date1) return 999;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  private addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}

export function calculateEconomicUnits(state: SkuLocDate): {
  economic: number;
  overstock: number;
  understock: number;
} {
  const totalInventory = state.on_hand_units_sim + state.on_order_units_sim + state.in_transit_units_sim;
  const target = state.target_units;

  return {
    economic: Math.min(totalInventory, target),
    overstock: Math.max(0, totalInventory - target),
    understock: Math.max(0, target - totalInventory),
  };
}
