import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
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
    
    // Validate request body
    const requestSchema = z.object({
      location_code: z.string().regex(/^(ALL|[A-Za-z0-9._-]+)$/, 'Invalid location code format').max(50, 'Location code too long'),
      sku: z.string().regex(/^(ALL|[A-Za-z0-9 ._-]+)$/, 'Invalid SKU format').max(100, 'SKU too long'),
      start_date: z.string(),
      end_date: z.string(),
      use_statistical_initial: z.boolean().optional().default(true),
    });

    const validationResult = requestSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters', details: validationResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { location_code, sku, start_date, end_date, use_statistical_initial } = validationResult.data;

    console.log(`DBM Calculation starting for location: ${location_code}, SKU: ${sku}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch raw data with pagination to handle PostgREST's 1000 row limit
    console.log(`Fetching data for ${location_code}, ${sku} from ${start_date} to ${end_date}...`);
    
    let rawData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const start = page * pageSize;
      const end = start + pageSize - 1;
      
      const { data: pageData, error: fetchError } = await supabase
        .rpc("get_fact_daily_raw", {
          p_location_code: location_code,
          p_sku: sku,
          p_start_date: start_date,
          p_end_date: end_date,
        })
        .range(start, end);

      if (fetchError) throw fetchError;
      
      if (!pageData || pageData.length === 0) {
        hasMore = false;
      } else {
        rawData = rawData.concat(pageData);
        console.log(`Fetched page ${page + 1}: ${pageData.length} records (total: ${rawData.length})`);
        
        // If we got less than pageSize, we've reached the end
        if (pageData.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }
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

      // Detect active period boundaries (first and last day with inventory > 0)
      let firstActiveDay = -1;
      let lastActiveDay = -1;
      
      records.forEach((record: any, idx: number) => {
        const onHand = record.on_hand_units || 0;
        if (onHand > 0) {
          if (firstActiveDay === -1) firstActiveDay = idx;
          lastActiveDay = idx;
        }
      });
      
      console.log(`Active period for ${loc}-${sk}: days ${firstActiveDay} to ${lastActiveDay} (total: ${records.length})`);

      // Calculate initial statistics from first 30 days (or available days)
      const initialPeriodDays = Math.min(30, records.length);
      const initialRecords = records.slice(0, initialPeriodDays);
      const salesData = initialRecords.map(r => r.units_sold || 0);
      
      let initialAvgSales = 0;
      let initialStDevSales = 0;
      
      if (salesData.length > 0) {
        initialAvgSales = salesData.reduce((sum, val) => sum + val, 0) / salesData.length;
        
        if (salesData.length > 1) {
          const variance = salesData.reduce((sum, val) => sum + Math.pow(val - initialAvgSales, 2), 0) / salesData.length;
          initialStDevSales = Math.sqrt(variance);
        }
      }

      console.log(`Initial stats for ${loc}-${sk}: avg=${initialAvgSales.toFixed(2)}, stdev=${initialStDevSales.toFixed(2)}`);

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
          // Day 1: Initialize with proper starting state
          const economicUnits = record.on_hand_units || 0;
          const hasSales = (record.units_sold || 0) > 0;
          
          let initialGreen: number;
          let initInfo = `OH=[${record.on_hand_units}], Sales=[${record.units_sold}]`;
          
          // Initial green logic based on C# migration rules
          if (economicUnits === 0 && !hasSales) {
            initialGreen = 0; // Not yet active
            initInfo += ` => NOT_ACTIVE=0`;
          } else if (economicUnits === 0 && hasSales) {
            initialGreen = 1; // Stocked out on first active day
            initInfo += ` => STOCKOUT=1`;
          } else {
            // Active with inventory - use statistical or economic units (min 1)
            initialGreen = Math.max(economicUnits, 1);
            
            // Calculate statistical initial green if enabled
            if (use_statistical_initial && initialAvgSales > 0 && initialStDevSales > 0) {
              const leadTime = 10; // Default, could be from location/product master
              const statisticalGreen = (initialAvgSales * leadTime) + (2 * Math.sqrt(leadTime) * initialStDevSales);
              
              initInfo += `, STAT=${statisticalGreen.toFixed(2)}`;
              
              if (statisticalGreen > initialGreen) {
                initialGreen = Math.ceil(statisticalGreen);
              }
            }
            
            initInfo += ` => ACTIVE=${initialGreen}`;
          }
          
          console.log(`${loc}-${sk} initialization: ${initInfo}`);
          
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
            accelerator_up_multiplier: 1.0,
            accelerator_down_multiplier: 0.67,
            accelerator_requires_inventory: true,
            accelerator_enable_zero_sales: true,
            is_in_active_period: (firstActiveDay !== -1) && (i >= firstActiveDay) && (i <= lastActiveDay),
          };
        } else {
          // Day 2+: Handle missing inventory data by copying from previous day
          if (record.on_hand_units === null || record.on_hand_units === undefined) {
            record.on_hand_units = previousDay!.unit_on_hand;
          }
          if (record.on_order_units === null || record.on_order_units === undefined) {
            record.on_order_units = previousDay!.unit_on_order;
          }
          if (record.in_transit_units === null || record.in_transit_units === undefined) {
            record.in_transit_units = previousDay!.unit_in_transit;
          }
          
          // Day 2+: Copy and carry forward state from previous day
          skuLocDate = {
            store_code: loc,
            product_code: sk,
            execution_date: record.d,
            unit_on_hand: record.on_hand_units,
            unit_on_order: record.on_order_units,
            unit_in_transit: record.in_transit_units,
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
            accelerator_up_multiplier: previousDay!.accelerator_up_multiplier || 1.0,
            accelerator_down_multiplier: previousDay!.accelerator_down_multiplier || 0.67,
            accelerator_requires_inventory: previousDay!.accelerator_requires_inventory ?? true,
            accelerator_enable_zero_sales: previousDay!.accelerator_enable_zero_sales ?? true,
            is_in_active_period: (firstActiveDay !== -1) && (i >= firstActiveDay) && (i <= lastActiveDay),
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
