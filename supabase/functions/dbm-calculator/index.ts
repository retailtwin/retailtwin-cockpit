import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DBMEngine, calculateEconomicUnits } from "./dbm-engine.ts";
import type { SkuLocDate } from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { location_code, sku, start_date, end_date } = body;

    console.log(`DBM Calculation starting for location: ${location_code}, SKU: ${sku}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch raw data ordered by location, sku, and date
    const { data: rawData, error: fetchError } = await supabase.rpc("get_fact_daily_raw", {
      p_location_code: location_code,
      p_sku: sku,
      p_start_date: start_date,
      p_end_date: end_date,
    });

    if (fetchError) throw fetchError;
    if (!rawData || rawData.length === 0) {
      return new Response(
        JSON.stringify({ error: "No data found for the specified filters" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetched ${rawData.length} records, grouping by SKU-location...`);

    // Group records by (location_code, sku) and sort by date
    const groups = new Map<string, any[]>();
    for (const record of rawData) {
      const key = `${record.location_code}|${record.sku}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    }

    // Sort each group by date
    for (const records of groups.values()) {
      records.sort((a, b) => new Date(a.d).getTime() - new Date(b.d).getTime());
    }

    console.log(`Processing ${groups.size} SKU-location combinations...`);

    // Initialize DBM engine
    const engine = new DBMEngine();
    const updates: any[] = [];
    let increases = 0;
    let decreases = 0;
    let unchanged = 0;

    // Process each SKU-location group chronologically
    for (const [key, records] of groups.entries()) {
      const [loc, sk] = key.split('|');
      console.log(`Processing ${loc}-${sk}: ${records.length} days`);

      // Track orders for this SKU-location
      const orders: Array<{
        created: string;
        quantity: number;
        units_on_order: number;
        units_in_transit: number;
        move_to_transit_date: string;
        receive_date: string;
      }> = [];

      let previousDay: SkuLocDate | null = null;

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const isFirstDay = i === 0;

        let skuLocDate: SkuLocDate;

        if (isFirstDay) {
          // Day 1: Initialize with proper starting state (like SetInitialSkuLocDate)
          const initialGreen = record.on_hand_units || 1; // Could be statistical, but starting simple
          
          skuLocDate = {
            store_code: loc,
            product_code: sk,
            execution_date: record.d,
            unit_on_hand: record.on_hand_units || 0,
            unit_on_order: record.on_order_units || 0,
            unit_in_transit: record.in_transit_units || 0,
            unit_sales: record.units_sold || 0,
            on_hand_units_sim: record.on_hand_units || 0, // Start simulated = actual
            green: initialGreen,
            yellow: 0,
            red: 0,
            dbm_zone: '',
            dbm_zone_previous: '',
            counter_green: 0,
            counter_yellow: 0,
            counter_red: 0,
            counter_overstock: 0,
            state: '', // CRITICAL: Empty string, not "new"
            decision: '',
            frozen: false,
            excluded_level: 0,
            safety_level: 1,
            lead_time: 10,
            last_manual: record.d,
            last_out_of_red: '2000-01-01',
            last_non_overstock: '2000-01-01',
            last_decrease: '2000-01-01',
            last_increase: '2000-01-01',
            last_accelerated: '2000-01-01',
            responsiveness_idle_days: 7,
            responsiveness_up_percentage: 1.5,
            responsiveness_down_percentage: 0.5,
            average_weekly_sales_units: (record.units_sold || 0) * 7,
            units_economic: 0,
            units_economic_overstock: 0,
            units_economic_understock: 0,
            accelerator_condition: '',
            accelerator_minimum_target: 1,
            accelerator_up_multiplier: 1.0,
            accelerator_down_multiplier: 0.67,
            accelerator_requires_inventory: true,
            accelerator_enable_zero_sales: true,
          };
        } else {
          // Day 2+: Copy and carry forward state from previous day
          skuLocDate = {
            store_code: loc,
            product_code: sk,
            execution_date: record.d,
            unit_on_hand: record.on_hand_units || previousDay!.unit_on_hand,
            unit_on_order: record.on_order_units || previousDay!.unit_on_order,
            unit_in_transit: record.in_transit_units || previousDay!.unit_in_transit,
            unit_sales: record.units_sold || 0,
            on_hand_units_sim: previousDay!.on_hand_units_sim || 0,
            green: previousDay!.green || 1,
            yellow: previousDay!.yellow || 0,
            red: previousDay!.red || 0,
            dbm_zone: previousDay!.dbm_zone || '',
            dbm_zone_previous: previousDay!.dbm_zone || '',
            counter_green: previousDay!.counter_green || 0,
            counter_yellow: previousDay!.counter_yellow || 0,
            counter_red: previousDay!.counter_red || 0,
            counter_overstock: previousDay!.counter_overstock || 0,
            state: previousDay!.state || '',
            decision: previousDay!.decision || '',
            frozen: previousDay!.frozen || false,
            excluded_level: previousDay!.excluded_level || 0,
            safety_level: previousDay!.safety_level || 1,
            lead_time: previousDay!.lead_time || 10,
            last_manual: previousDay!.last_manual || record.d,
            last_out_of_red: previousDay!.last_out_of_red || '2000-01-01',
            last_non_overstock: previousDay!.last_non_overstock || '2000-01-01',
            last_decrease: previousDay!.last_decrease || '2000-01-01',
            last_increase: previousDay!.last_increase || '2000-01-01',
            last_accelerated: previousDay!.last_accelerated || '2000-01-01',
            responsiveness_idle_days: previousDay!.responsiveness_idle_days || 7,
            responsiveness_up_percentage: previousDay!.responsiveness_up_percentage || 1.5,
            responsiveness_down_percentage: previousDay!.responsiveness_down_percentage || 0.5,
            average_weekly_sales_units: (record.units_sold || 0) * 7,
            units_economic: 0,
            units_economic_overstock: 0,
            units_economic_understock: 0,
            accelerator_condition: '',
            accelerator_minimum_target: previousDay!.accelerator_minimum_target || 1,
            accelerator_up_multiplier: previousDay!.accelerator_up_multiplier || 1.0,
            accelerator_down_multiplier: previousDay!.accelerator_down_multiplier || 0.67,
            accelerator_requires_inventory: previousDay!.accelerator_requires_inventory ?? true,
            accelerator_enable_zero_sales: previousDay!.accelerator_enable_zero_sales ?? true,
          };
        }

        // PRE-DBM PROCESSING: Receive orders and subtract yesterday's sales
        if (!isFirstDay && previousDay) {
          // 1. Receive orders that arrived today
          const ordersToReceive = orders.filter(o => o.receive_date === record.d);
          for (const order of ordersToReceive) {
            skuLocDate.on_hand_units_sim! += order.units_in_transit;
            order.units_in_transit = 0;
          }

          // 2. Subtract yesterday's sales from today's simulated on-hand
          const yesterdaySales = previousDay.unit_sales || 0;
          const availableToSell = Math.max(0, skuLocDate.on_hand_units_sim! || 0);
          const actualSalesSim = Math.min(yesterdaySales, availableToSell);
          skuLocDate.on_hand_units_sim = (skuLocDate.on_hand_units_sim || 0) - actualSalesSim;
        }

        // Run DBM algorithm
        const result = engine.executeDBMAlgorithm(skuLocDate);

        // POST-DBM PROCESSING: Create orders and move orders through pipeline
        
        // 1. Calculate economic stock (simulated)
        const economicStockSim = (result.on_hand_units_sim || 0) + 
                                 orders.reduce((sum, o) => sum + o.units_on_order + o.units_in_transit, 0);
        
        // 2. Create order if needed (economic stock < green target)
        const unitsToOrder = (result.green || 1) - economicStockSim;
        if (unitsToOrder > 0) {
          const leadTime = result.lead_time || 10;
          const orderDate = new Date(record.d);
          const receiveDate = new Date(orderDate);
          receiveDate.setDate(receiveDate.getDate() + leadTime);

          orders.push({
            created: record.d,
            quantity: unitsToOrder,
            units_on_order: unitsToOrder,
            units_in_transit: 0,
            move_to_transit_date: record.d, // Simplified: immediate transit
            receive_date: receiveDate.toISOString().split('T')[0],
          });
        }

        // 3. Move orders from on-order to in-transit
        const ordersToTransit = orders.filter(o => o.move_to_transit_date === record.d && o.units_on_order > 0);
        for (const order of ordersToTransit) {
          order.units_in_transit = order.units_on_order;
          order.units_on_order = 0;
        }

        // 4. Calculate totals for simulated on-order and in-transit
        const totalOnOrderSim = orders.reduce((sum, o) => sum + o.units_on_order, 0);
        const totalInTransitSim = orders.reduce((sum, o) => sum + o.units_in_transit, 0);

        // Calculate economic units
        const { economic, overstock } = calculateEconomicUnits(result);

        // Track changes
        const oldTarget = record.target_units || 1;
        const newTarget = result.green || 1;
        if (newTarget > oldTarget) increases++;
        else if (newTarget < oldTarget) decreases++;
        else unchanged++;

        // Prepare update
        updates.push({
          location_code: loc,
          sku: sk,
          d: record.d,
          on_hand_units_sim: result.on_hand_units_sim || 0,
          target_units: newTarget,
          economic_units: economic,
          economic_overstock_units: overstock,
        });

        // Store for next iteration
        previousDay = result;
      }
    }

    console.log(`Processed ${updates.length} records: ${increases} increases, ${decreases} decreases, ${unchanged} unchanged`);

    // Batch update fact_daily with simulation results
    if (updates.length > 0) {
      const { error: updateError } = await supabase.rpc("update_fact_daily_batch", {
        updates: updates,
      });

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          processed: rawData.length,
          increases,
          decreases,
          unchanged,
          message: `Simulation complete: ${increases} increases, ${decreases} decreases, ${unchanged} unchanged`,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
