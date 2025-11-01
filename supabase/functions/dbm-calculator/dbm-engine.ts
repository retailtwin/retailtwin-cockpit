import type { SkuLocDate } from './types.ts';

export class DBMEngine {
  private slt: SkuLocDate;
  
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
  
  // Placeholder methods - will be implemented in next prompt
  private getCounterGreen(counter: number, state: string, frozen: boolean, zone: string, prevZone: string, decision: string): number {
    return counter;
  }
  
  private getCounterYellow(counter: number, state: string, frozen: boolean, zone: string): number {
    return counter;
  }
  
  private getCounterRed(counter: number, state: string, frozen: boolean, zone: string, prevZone: string, decision: string): number {
    return counter;
  }
  
  private getCounterOverstock(counter: number, state: string, frozen: boolean, zone: string, decision: string): number {
    return counter;
  }
  
  private getLastManual(lastManual: string, state: string, frozen: boolean, execDate: string): string {
    return lastManual;
  }
  
  private getLastOutOfRed(lastOutOfRed: string, green: number, state: string, frozen: boolean, zone: string, prevZone: string, execDate: string): string {
    return lastOutOfRed;
  }
  
  private getLastNonOverstock(lastNonOverstock: string, green: number, state: string, frozen: boolean, zone: string, execDate: string): string {
    return lastNonOverstock;
  }
  
  private getGreen(sl: SkuLocDate): number {
    return sl.green || 0;
  }
  
  private getDecision(sl: SkuLocDate): string {
    return sl.decision;
  }
  
  private getState(sl: SkuLocDate): string {
    return sl.state;
  }
  
  private getAcceleratedTarget(sl: SkuLocDate): number {
    return sl.green || 0;
  }
  
  private getLastDecrease(sl: SkuLocDate): string {
    return sl.last_decrease;
  }
  
  private getLastIncrease(sl: SkuLocDate): string {
    return sl.last_increase;
  }
}
