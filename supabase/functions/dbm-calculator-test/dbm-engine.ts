import { SkuLocDate } from "./types.ts";

export class DBMEngine {
  private SLT!: SkuLocDate;

  executeDBMAlgorithm(sl: SkuLocDate): SkuLocDate {
    this.SLT = { ...sl };

    // 1. DETERMINE AVAILABLE STOCK
    // THE FIX: Use simulated stock if it exists (Future), otherwise real stock (Today)
    const stockToCheck = (this.SLT.on_hand_units_sim !== undefined) 
      ? this.SLT.on_hand_units_sim 
      : this.SLT.unit_on_hand;

    // 2. CALCULATE ZONES
    const buffer = this.SLT.green;
    const redZone = Math.floor(buffer * 0.33);
    const yellowZone = Math.floor(buffer * 0.66);

    // 3. DETERMINE CURRENT ZONE
    if (stockToCheck <= redZone) {
      this.SLT.dbm_zone = "red";
    } else if (stockToCheck <= yellowZone) {
      this.SLT.dbm_zone = "yellow";
    } else {
      this.SLT.dbm_zone = "green";
    }

    // 4. EXECUTE DECISION LOGIC
    this.processZoneDecision();

    return this.SLT;
  }

  private processZoneDecision() {
    if (this.SLT.dbm_zone !== "red") this.SLT.counter_red = 0;
    if (this.SLT.dbm_zone !== "green") this.SLT.counter_green = 0;

    if (this.SLT.dbm_zone === "red") {
      this.SLT.counter_red = (this.SLT.counter_red || 0) + 1;
    } else if (this.SLT.dbm_zone === "green") {
      this.SLT.counter_green = (this.SLT.counter_green || 0) + 1;
    }

    if (this.SLT.counter_red >= this.SLT.lead_time) {
       this.SLT.green = Math.floor(this.SLT.green * 1.33);
       this.SLT.decision = "increase";
       this.SLT.counter_red = 0;
    } else if (this.SLT.counter_green >= this.SLT.lead_time) {
       this.SLT.decision = "maintain"; // Simplified for this verification
    } else {
       this.SLT.decision = "wait";
    }
  }
}
EOFcat << 'EOF' > supabase/functions/dbm-calculator-test/dbm-engine.ts
import { SkuLocDate } from "./types.ts";

export class DBMEngine {
  private SLT!: SkuLocDate;

  executeDBMAlgorithm(sl: SkuLocDate): SkuLocDate {
    this.SLT = { ...sl };

    // 1. DETERMINE AVAILABLE STOCK
    // THE FIX: Use simulated stock if it exists (Future), otherwise real stock (Today)
    const stockToCheck = (this.SLT.on_hand_units_sim !== undefined) 
      ? this.SLT.on_hand_units_sim 
      : this.SLT.unit_on_hand;

    // 2. CALCULATE ZONES
    const buffer = this.SLT.green;
    const redZone = Math.floor(buffer * 0.33);
    const yellowZone = Math.floor(buffer * 0.66);

    // 3. DETERMINE CURRENT ZONE
    if (stockToCheck <= redZone) {
      this.SLT.dbm_zone = "red";
    } else if (stockToCheck <= yellowZone) {
      this.SLT.dbm_zone = "yellow";
    } else {
      this.SLT.dbm_zone = "green";
    }

    // 4. EXECUTE DECISION LOGIC
    this.processZoneDecision();

    return this.SLT;
  }

  private processZoneDecision() {
    if (this.SLT.dbm_zone !== "red") this.SLT.counter_red = 0;
    if (this.SLT.dbm_zone !== "green") this.SLT.counter_green = 0;

    if (this.SLT.dbm_zone === "red") {
      this.SLT.counter_red = (this.SLT.counter_red || 0) + 1;
    } else if (this.SLT.dbm_zone === "green") {
      this.SLT.counter_green = (this.SLT.counter_green || 0) + 1;
    }

    if (this.SLT.counter_red >= this.SLT.lead_time) {
       this.SLT.green = Math.floor(this.SLT.green * 1.33);
       this.SLT.decision = "increase";
       this.SLT.counter_red = 0;
    } else if (this.SLT.counter_green >= this.SLT.lead_time) {
       this.SLT.decision = "maintain"; // Simplified for this verification
    } else {
       this.SLT.decision = "wait";
    }
  }
}
