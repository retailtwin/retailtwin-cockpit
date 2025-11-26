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

    // Fetch raw data
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

    console.log(`Fetched ${rawData.length} records, processing...`);

    // Initialize DBM engine
    const engine = new DBMEngine();
    const updates: any[] = [];
    let increases = 0;
    let decreases = 0;
    let unchanged = 0;

    // Process each record through DBM algorithm
    for (const record of rawData) {
      const skuLocDate: SkuLocDate = {
        store_code: record.location_code,
        product_code: record.sku,
        execution_date: record.d,
        unit_on_hand: record.on_hand_units || 0,
        unit_on_order: record.on_order_units || 0,
        unit_in_transit: record.in_transit_units || 0,
        unit_sales: record.units_sold || 0,
        green: record.target_units || 1,
        yellow: 0,
        red: 0,
        dbm_zone: 'green',
        dbm_zone_previous: 'green',
        counter_green: 0,
        counter_yellow: 0,
        counter_red: 0,
        counter_overstock: 0,
        state: 'new',
        decision: 'new',
        frozen: false,
        excluded_level: 0,
        safety_level: 1,
        lead_time: 10,
        last_manual: record.d,
        last_out_of_red: record.d,
        last_non_overstock: record.d,
        last_decrease: record.d,
        last_increase: record.d,
        last_accelerated: record.d,
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

      // Run DBM algorithm
      const result = engine.executeDBMAlgorithm(skuLocDate);
      
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
        location_code: record.location_code,
        sku: record.sku,
        d: record.d,
        on_hand_units_sim: result.unit_on_hand,
        target_units: newTarget,
        economic_units: economic,
        economic_overstock_units: overstock,
      });
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
