import type { SkuLocDate } from './types.ts';

export class DBMEngine {
  private slt!: SkuLocDate;
  
  executeDBMAlgorithm(sl: SkuLocDate): SkuLocDate {
    this.slt = { ...sl };
    
    // Set zones
    this.slt.yellow = this.getYellow(this.slt);
    this.slt.red = this.getRed(this.slt);
    
    // Calculate zone
    this.slt.dbm_zone = this.getDBMZone(
      this.slt.unit_on_hand,
      this.slt.green || 0,
      this.slt.yellow,
      this.slt.red
    );
    
    // Update counters
    this.slt.counter_green = this.getCounterGreen(
      this.slt.counter_green, this.slt.state, this.slt.frozen,
      this.slt.dbm_zone, this.slt.dbm_zone_previous, this.slt.decision
    );
    this.slt.counter_yellow = this.getCounterYellow(
      this.slt.counter_yellow, this.slt.state, this.slt.frozen, this.slt.dbm_zone
    );
    this.slt.counter_red = this.getCounterRed(
      this.slt.counter_red, this.slt.state, this.slt.frozen,
      this.slt.dbm_zone, this.slt.dbm_zone_previous, this.slt.decision
    );
    this.slt.counter_overstock = this.getCounterOverstock(
      this.slt.counter_overstock, this.slt.state, this.slt.frozen,
      this.slt.dbm_zone, this.slt.decision
    );
    
    // Update dates
    this.slt.last_manual = this.getLastManual(
      this.slt.last_manual, this.slt.state, this.slt.frozen, this.slt.execution_date
    );
    this.slt.last_out_of_red = this.getLastOutOfRed(
      this.slt.last_out_of_red, this.slt.green || 0, this.slt.state,
      this.slt.frozen, this.slt.dbm_zone, this.slt.dbm_zone, this.slt.execution_date
    );
    this.slt.last_non_overstock = this.getLastNonOverstock(
      this.slt.last_non_overstock, this.slt.green || 0, this.slt.state,
      this.slt.frozen, this.slt.dbm_zone, this.slt.execution_date
    );
    
    // Main calculation
    this.slt.green = this.getGreen(this.slt);
    this.slt.decision = this.getDecision(this.slt);
    this.slt.state = this.getState(this.slt);
    
    // Accelerators
    this.slt.green = this.getAcceleratedTarget(this.slt);
    
    // Recalculate zones
    this.slt.yellow = this.getYellow(this.slt);
    this.slt.red = this.getRed(this.slt);
    
    // Final dates
    this.slt.last_decrease = this.getLastDecrease(this.slt);
    this.slt.last_increase = this.getLastIncrease(this.slt);
    
    return this.slt;
  }
  
  private getDBMZone(unitOnHand: number, green: number, yellow: number, red: number): string {
    if (unitOnHand > green) return 'overstock';
    if (unitOnHand <= green && unitOnHand > yellow) return 'green';
    if (unitOnHand <= yellow && unitOnHand > red) return 'yellow';
    return 'red';
  }
  
  private getYellow(sl: SkuLocDate): number {
    const green = sl.green || 0;
    if (green <= 2) return 1;
    if (sl.excluded_level > 0) {
      return Math.floor(green - Math.ceil((green - sl.excluded_level) / 3));
    }
    return Math.floor(Math.ceil(green / 3) * 2);
  }
  
  private getRed(sl: SkuLocDate): number {
    const green = sl.green || 0;
    if (green <= 2) return 1;
    if (sl.excluded_level > 0) {
      return Math.floor(green - Math.ceil((green - sl.excluded_level) / 3));
    }
    return Math.floor(Math.ceil(green / 3));
  }
  
  private getCounterGreen(counter: number, status: string, frozen: boolean, 
                          newZone: string, zone: string, decision: string): number {
    if (status === 'static' || frozen) return counter;
    if (status === 'new' || status === 'manual') return 0;
    if ((newZone === 'green' || newZone === 'overstock') && decision === 'dec_from_green') return 0;
    if (newZone === 'green' || newZone === 'overstock') return counter + 1;
    if ((zone === 'green' || zone === 'overstock') && newZone !== zone) return counter + 1;
    if (newZone === 'green') return counter + 1;
    return 0;
  }
  
  private getCounterYellow(counter: number, status: string, frozen: boolean, newZone: string): number {
    if (status === 'static' || frozen) return counter;
    if (status === 'new') return 0;
    if (newZone === 'yellow') return counter + 1;
    return 0;
  }
  
  private getCounterRed(counter: number, status: string, frozen: boolean,
                        newZone: string, zone: string, decision: string): number {
    if (status === 'static' || frozen) return counter;
    if (status === 'new' || status === 'manual') return 0;
    if (newZone === 'red' && decision === 'inc_from_red') return 1;
    if (zone === 'red' || newZone === 'red') return counter + 1;
    return 0;
  }
  
  private getCounterOverstock(counter: number, status: string, frozen: boolean,
                              newZone: string, decision: string): number {
    if (status === 'static' || frozen) return counter;
    if (status === 'new') return 0;
    if (newZone === 'red' && decision === 'inc_from_red') return 1;
    if (newZone === 'overstock') return counter + 1;
    return 0;
  }
  
  private getLastManual(date: string, status: string, frozen: boolean, executionDate: string): string {
    if (status === 'static' || frozen) return date;
    if (status === 'manual') return executionDate;
    return date;
  }
  
  private getLastOutOfRed(date: string, green: number, status: string, frozen: boolean,
                          newZone: string, zone: string, executionDate: string): string {
    if (status === 'static' || frozen) return date;
    if (zone === 'red' && newZone !== zone && green > 1) return executionDate;
    return date;
  }
  
  private getLastNonOverstock(date: string, green: number, status: string, frozen: boolean,
                              newZone: string, executionDate: string): string {
    if (status === 'static' || frozen) return date;
    if (newZone !== 'overstock' && green > 1) return executionDate;
    return date;
  }
  
  private getGreen(sl: SkuLocDate): number {
    const green = sl.green || 0;
    
    // Manual override
    if (sl.decision === 'manual' && this.daysBetween(sl.execution_date, sl.last_manual) === 0) {
      return green;
    }
    
    // No change conditions
    if ((sl.frozen && green > 0) || sl.state === 'manual' || 
        sl.state === 'static' || sl.state === 'new') {
      return green;
    }
    
    // Manual wait period
    if (this.daysBetween(sl.execution_date, sl.last_manual) <= 3) {
      return green;
    }
    
    // Initialize to 1 if zero
    if (green === 0) return 1;
    
    // Decrease conditions
    const canDecrease = 
      sl.counter_green > sl.lead_time &&
      (sl.dbm_zone === 'green' || sl.dbm_zone === 'overstock') &&
      this.daysBetween(sl.execution_date, sl.last_non_overstock) < sl.lead_time &&
      this.daysBetween(sl.execution_date, sl.last_decrease) > sl.lead_time &&
      green > 1;
    
    if (canDecrease) {
      const newTarget = green - Math.ceil((green - sl.excluded_level) / 3);
      
      if (newTarget < sl.safety_level) return sl.safety_level;
      if (newTarget < sl.excluded_level) return sl.excluded_level;
      if (newTarget !== green) return Math.floor(newTarget);
    }
    
    // Increase from red
    if (sl.counter_red > sl.lead_time &&
        sl.dbm_zone === 'red' &&
        this.daysBetween(sl.execution_date, sl.last_out_of_red) < sl.lead_time) {
      return Math.floor(green + Math.ceil((green - sl.excluded_level) / 3));
    }
    
    // Adjust to safety/excluded levels
    if (green < sl.safety_level) return sl.safety_level;
    if (green < sl.excluded_level) return sl.excluded_level;
    
    return green;
  }
  
  private getDecision(sl: SkuLocDate): string {
    const green = sl.green || 0;
    
    if (sl.decision === 'manual' && this.daysBetween(sl.execution_date, sl.last_manual) === 0) {
      return 'manual';
    }
    if (sl.state === 'manual' || sl.state === 'static' || sl.state === 'new') {
      return sl.state;
    }
    if (this.daysBetween(sl.execution_date, sl.last_manual) <= 3) {
      return 'manual_wait';
    }
    if (green === 0) return 'inc_to_one';
    
    const canDecrease = 
      sl.counter_green > sl.lead_time &&
      (sl.dbm_zone === 'green' || sl.dbm_zone === 'overstock') &&
      this.daysBetween(sl.execution_date, sl.last_non_overstock) < sl.lead_time &&
      this.daysBetween(sl.execution_date, sl.last_decrease) > sl.lead_time &&
      green > 1;
    
    if (canDecrease) {
      const newTarget = green - Math.abs((green - sl.excluded_level) / 3);
      if (newTarget < sl.safety_level) return 'dec_to_safety';
      if (newTarget < sl.excluded_level) return 'dec_to_excluded';
      if (newTarget !== green) return 'dec_from_green';
    }
    
    if (sl.counter_red > sl.lead_time && sl.dbm_zone === 'red' &&
        this.daysBetween(sl.execution_date, sl.last_out_of_red) > sl.lead_time) {
      return 'inc_from_red';
    }
    
    if (green < sl.safety_level) return 'adj_to_safety';
    if (green < sl.excluded_level) return 'adj_to_excluded';
    
    if (sl.dbm_zone === 'red' && sl.dbm_zone !== sl.dbm_zone_previous &&
        this.daysBetween(sl.execution_date, sl.last_out_of_red) < sl.lead_time) {
      return 'red_count_1';
    }
    if (sl.dbm_zone === 'red') return 'red_count_2';
    if (sl.dbm_zone === 'yellow') return 'yellow_count';
    if (sl.dbm_zone === 'green') return 'green_count';
    if (sl.dbm_zone === 'overstock') return 'overstock';
    
    return 'none';
  }
  
  private getState(sl: SkuLocDate): string {
    if (sl.frozen) return 'frozen';
    if (sl.decision === 'manual') return 'manual_await';
    if (sl.decision === 'inc_from_red') return 'increase';
    if (sl.decision === 'dec_from_green') return 'decrease';
    if (sl.decision === 'red_count_1') return 'escape_red';
    if (sl.decision === 'red_count_2') return 'red_count';
    if (sl.decision === 'new') return 'none';
    return sl.state;
  }
  
  private getAcceleratedTarget(sl: SkuLocDate): number {
    const green = sl.green || 0;
    
    if (this.daysBetween(sl.execution_date, sl.last_accelerated) <= sl.responsiveness_idle_days) {
      return green;
    }
    
    // Accelerator UP
    if (sl.responsiveness_up_percentage !== 0 && sl.average_weekly_sales_units !== 0) {
      const thresholdUp = sl.responsiveness_up_percentage * green;
      if (sl.average_weekly_sales_units >= thresholdUp) {
        sl.state = 'responsiveness';
        sl.decision = 'increase';
        sl.accelerator_condition = 'above threshold';
        sl.last_accelerated = sl.execution_date;
        return green + Math.ceil(sl.average_weekly_sales_units);
      }
    }
    
    // Accelerator DOWN
    if (sl.responsiveness_down_percentage !== 0 && sl.average_weekly_sales_units !== 0) {
      const thresholdDown = sl.responsiveness_down_percentage * green;
      if (sl.average_weekly_sales_units < thresholdDown) {
        sl.state = 'responsiveness';
        sl.decision = 'decrease';
        sl.accelerator_condition = 'below threshold';
        sl.last_accelerated = sl.execution_date;
        return green - Math.ceil(green * (2 / 3));
      }
    }
    
    return green;
  }
  
  private getLastDecrease(sl: SkuLocDate): string {
    return sl.decision === 'dec_from_green' ? sl.execution_date : sl.last_decrease;
  }
  
  private getLastIncrease(sl: SkuLocDate): string {
    return sl.decision === 'inc_from_red' ? sl.execution_date : sl.last_increase;
  }
  
  private daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor(Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  }
}

export function calculateEconomicUnits(sl: SkuLocDate) {
  const green = sl.green || 0;
  const economic = Math.max(0, sl.unit_on_hand + sl.unit_on_order + sl.unit_in_transit);
  const overstock = Math.max(0, economic - green);
  const understock = Math.max(0, green - economic);
  return { economic, overstock, understock };
}
