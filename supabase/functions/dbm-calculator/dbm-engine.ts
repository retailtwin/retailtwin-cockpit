// dbm-engine.ts - DBM 3.0 Algorithm Implementation
import type { SkuLocDate, Settings, Order } from './types.ts';

export class DBMEngine {
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
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
    }

    this.processOrderArrivals(state, orders, currentDate);
    this.applyDailySales(state);
    this.calculateZones(state);
    this.determineZone(state);
    this.updateCounters(state);

    const decision = this.getDecision(state, currentDate);
    state.decision = decision;

    if (decision === 'increase' || decision === 'decrease') {
      this.adjustBuffer(state, decision === 'increase', currentDate);
    }

    let newOrder: Order | null = null;
    if (decision === 'order') {
      newOrder = this.createOrder(state, currentDate);
      if (newOrder && newOrder.units_ordered > 0) {
        state.on_order_units_sim += newOrder.units_ordered;
      }
    }

    return { state, newOrder };
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
   * CORRECTED Decision Logic (per Document 4)
   * Priority order in RED zone:
   *   1. Check if counter >= lead_time AND cooldown passed -> "increase"
   *   2. Check if at/below safety level -> "order"
   *   3. Otherwise -> "maintain"
   */
  private getDecision(state: SkuLocDate, currentDate: string): string {
    if (state.frozen) {
      return 'maintain';
    }

    const daysSinceAcceleration = this.daysBetween(state.last_accelerated, currentDate);
    const cooldownPassed = daysSinceAcceleration >= this.settings.acceleration_idle_days;

    // RED ZONE LOGIC
    if (state.dbm_zone === 'red') {
      // FIRST: Check for buffer increase (counter threshold + cooldown)
      if (state.counter_red >= state.lead_time && cooldownPassed) {
        return 'increase';
      }
      // SECOND: Check for order (at or below safety level)
      if (state.on_hand_units_sim <= state.safety_level) {
        return 'order';
      }
      return 'maintain';
    }

    // GREEN ZONE LOGIC
    if (state.dbm_zone === 'green') {
      if (state.counter_green >= state.lead_time && cooldownPassed) {
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
    } else {
      const factor = 1 - this.settings.accelerator_down_percentage;
      newTarget = Math.floor(currentTarget * factor);
      const floor = Math.max(state.safety_level, this.settings.accelerator_minimum_target);
      newTarget = Math.max(newTarget, floor);
      state.accelerator_condition = 'DECREASED';
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
