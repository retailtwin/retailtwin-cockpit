// index.ts - DBM Calculator Edge Function
// Updated: Added order_days and dynamic_period settings support
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DBMEngine } from './dbm-engine.ts';
import type { SkuLocDate, Settings, Order, SimulationRequest, SimulationResult, SkuLocationKPIs, KPIs } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 1000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const request: SimulationRequest = await req.json();
    const { company_id, location_code, sku, start_date, end_date } = request;

    // Treat "ALL", "All Products", "9999", or empty string as undefined (no filter)
    const effectiveSku = (sku && sku !== 'ALL' && sku !== 'All Products') ? sku : undefined;
    const effectiveLocation = (location_code && location_code !== '9999' && location_code !== 'ALL') ? location_code : undefined;

    if (!company_id || !start_date || !end_date) {
      throw new Error('Missing required fields: company_id, start_date, end_date');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const simulationDays = daysBetweenDates(start_date, end_date) + 1;
    console.log(`DBM Simulation: ${simulationDays} days, company=${company_id}`);

    const settings = await loadSettings(supabase, company_id);
    console.log(`Settings loaded: order_days="${settings.order_days}", dynamic_period=${settings.dynamic_period}`);

    const rawData = await fetchAllData(supabase, company_id, effectiveLocation, effectiveSku, start_date, end_date);
    
    if (rawData.length === 0) {
      return new Response(JSON.stringify({ success: true, result: { processed_days: 0, sku_locations: 0, orders_created: 0, buffer_increases: 0, buffer_decreases: 0, errors: [], kpis: null } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const groups = groupBySkuLocation(rawData);
    const engine = new DBMEngine(settings);
    const allOrders: Order[] = [];
    const results: SkuLocDate[] = [];
    const skuLocationKPIs: SkuLocationKPIs[] = [];
    
    let totalBufferIncreases = 0, totalBufferDecreases = 0, totalOrdersCreated = 0;
    let grandTotalStockoutDays = 0, grandTotalUnitsSold = 0, grandSumDailyInventory = 0, skuLocsWithStockOnLastDay = 0;
    let grandTotalActiveDays = 0; // NEW: Track total active days across all SKU-Locations

    for (const [key, rows] of groups) {
      let previous: SkuLocDate | null = null;
      let skuOrders = 0, skuIncreases = 0, skuDecreases = 0;
      let sumDailyInventory = 0, totalUnitsSold = 0;
      let daysInRed = 0, daysInYellow = 0, daysInGreen = 0, daysInOverstock = 0;

      // NEW: Find the first day with activity (inventory or sales) for dynamic_period
      let firstActivityIndex = 0;
      let firstActivityDate: string | null = null;
      
      if (settings.dynamic_period) {
        // Find first day where there's either inventory > 0 or sales > 0
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if ((row.on_hand_units > 0) || (row.units_sold > 0) || 
              (row.on_order_units > 0) || (row.in_transit_units > 0)) {
            firstActivityIndex = i;
            firstActivityDate = row.day;
            break;
          }
        }
      }

      // Calculate active days for this SKU-Location
      const activeDays = settings.dynamic_period 
        ? rows.length - firstActivityIndex 
        : rows.length;

      // Process rows (starting from first activity if dynamic_period is enabled)
      const startIndex = settings.dynamic_period ? firstActivityIndex : 0;
      
      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        const isFirstDay = previous === null;
        const current = mapRowToSkuLocDate(row, settings, isFirstDay);
        const { state, newOrder } = engine.processDay(current, previous, allOrders, row.day);

        sumDailyInventory += state.on_hand_units_sim;
        totalUnitsSold += state.units_sold;

        if (state.dbm_zone === 'red') daysInRed++;
        else if (state.dbm_zone === 'yellow') daysInYellow++;
        else if (state.dbm_zone === 'green') daysInGreen++;
        else if (state.dbm_zone === 'overstock') daysInOverstock++;

        if (state.decision === 'increase') { skuIncreases++; totalBufferIncreases++; }
        if (state.decision === 'decrease') { skuDecreases++; totalBufferDecreases++; }
        if (newOrder) { allOrders.push(newOrder); skuOrders++; totalOrdersCreated++; }

        results.push(state);
        previous = state;
      }

      // Skip if no days were processed (e.g., dynamic_period with no activity)
      if (!previous) continue;

      const lastState = previous;
      const stockoutDays = lastState.stockout_days;
      
      // NEW: Use active days instead of simulation days for averages
      const avgInventory = activeDays > 0 ? sumDailyInventory / activeDays : 0;
      const hasStockOnLastDay = lastState.on_hand_units_sim > 0;
      const serviceLevel = activeDays > 0 ? ((activeDays - stockoutDays) / activeDays) * 100 : 0;
      const rawTurns = avgInventory > 0 ? totalUnitsSold / avgInventory : 0;
      const annualizedTurns = activeDays > 0 ? rawTurns * (365 / activeDays) : 0;
      const daysToCash = totalUnitsSold > 0 ? sumDailyInventory / totalUnitsSold : null;

      skuLocationKPIs.push({
        sku: lastState.sku, location_code: lastState.location_code,
        simulation_days: simulationDays, // Original window
        stockout_days: stockoutDays,
        service_level: Math.round(serviceLevel * 100) / 100,
        total_units_sold: totalUnitsSold, sum_daily_inventory: sumDailyInventory,
        average_inventory: Math.round(avgInventory * 100) / 100,
        inventory_turns_annualized: Math.round(annualizedTurns * 100) / 100,
        days_to_cash: daysToCash !== null ? Math.round(daysToCash * 100) / 100 : null,
        has_stock_on_last_day: hasStockOnLastDay,
        orders_placed: skuOrders, buffer_increases: skuIncreases, buffer_decreases: skuDecreases,
        final_target: lastState.target_units,
        days_in_red: daysInRed, days_in_yellow: daysInYellow, days_in_green: daysInGreen, days_in_overstock: daysInOverstock,
        // NEW: Include active window info
        active_days: activeDays,
        first_activity_date: firstActivityDate || start_date,
      });

      grandTotalStockoutDays += stockoutDays;
      grandTotalUnitsSold += totalUnitsSold;
      grandSumDailyInventory += sumDailyInventory;
      grandTotalActiveDays += activeDays; // NEW: Accumulate active days
      if (hasStockOnLastDay) skuLocsWithStockOnLastDay++;
    }

    for (let i = 0; i < results.length; i += 50) {
      const batch = results.slice(i, i + 50);
      await Promise.all(batch.map(state =>
        supabase.schema('aifo').from('fact_daily').update({
          on_hand_units_sim: state.on_hand_units_sim, on_order_units_sim: state.on_order_units_sim,
          in_transit_units_sim: state.in_transit_units_sim, target_units: state.target_units,
          dbm_zone: state.dbm_zone, dbm_zone_previous: state.dbm_zone_previous, decision: state.decision,
          counter_red: state.counter_red, counter_green: state.counter_green,
          counter_yellow: state.counter_yellow, counter_overstock: state.counter_overstock,
          stockout_days: state.stockout_days, last_accelerated: state.last_accelerated,
          accelerator_condition: state.accelerator_condition, safety_level: state.safety_level,
        }).eq('company_id', state.company_id).eq('location_code', state.location_code).eq('sku', state.sku).eq('day', state.day)
      ));
    }

    const numSkuLocations = skuLocationKPIs.length; // Use actual processed count
    
    // NEW: Use active days for aggregate calculations when dynamic_period is enabled
    const totalSimulationDays = settings.dynamic_period 
      ? grandTotalActiveDays 
      : simulationDays * numSkuLocations;
    
    const aggregateServiceLevel = totalSimulationDays > 0 ? ((totalSimulationDays - grandTotalStockoutDays) / totalSimulationDays) * 100 : 0;
    const fillRate = numSkuLocations > 0 ? (skuLocsWithStockOnLastDay / numSkuLocations) * 100 : 0;
    const grandAvgInventory = totalSimulationDays > 0 ? grandSumDailyInventory / totalSimulationDays : 0;
    
    // For annualized turns, use the average active days per SKU-Location
    const avgActiveDaysPerSku = numSkuLocations > 0 ? grandTotalActiveDays / numSkuLocations : simulationDays;
    const aggregateInventoryTurns = grandAvgInventory > 0 ? (grandTotalUnitsSold / grandAvgInventory) * (365 / avgActiveDaysPerSku) : 0;
    const aggregateDaysToCash = grandTotalUnitsSold > 0 ? grandSumDailyInventory / grandTotalUnitsSold : null;

    const kpis: KPIs = {
      service_level: Math.round(aggregateServiceLevel * 100) / 100,
      total_simulation_days: totalSimulationDays,
      total_stockout_days: grandTotalStockoutDays,
      fill_rate: Math.round(fillRate * 100) / 100,
      sku_locs_with_stock: skuLocsWithStockOnLastDay,
      sku_locs_total: numSkuLocations,
      snapshot_date: end_date,
      inventory_turns_annualized: Math.round(aggregateInventoryTurns * 100) / 100,
      days_to_cash: aggregateDaysToCash !== null ? Math.round(aggregateDaysToCash * 100) / 100 : null,
      total_units_sold: grandTotalUnitsSold,
      average_inventory: Math.round(grandAvgInventory * 100) / 100,
    };

    const result: SimulationResult = {
      processed_days: results.length, sku_locations: numSkuLocations,
      orders_created: totalOrdersCreated, buffer_increases: totalBufferIncreases, buffer_decreases: totalBufferDecreases,
      errors: [], kpis, by_sku_location: skuLocationKPIs,
    };

    return new Response(JSON.stringify({ success: true, result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('DBM error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});

function daysBetweenDates(d1: string, d2: string): number {
  return Math.floor(Math.abs(new Date(d2).getTime() - new Date(d1).getTime()) / (1000 * 60 * 60 * 24));
}

async function fetchAllData(supabase: any, company_id: string, location_code: string | undefined, sku: string | undefined, start_date: string, end_date: string): Promise<any[]> {
  const allData: any[] = [];
  let offset = 0, hasMore = true;
  while (hasMore) {
    let query = supabase.schema('aifo').from('fact_daily').select('*').eq('company_id', company_id).gte('day', start_date).lte('day', end_date).order('day', { ascending: true }).range(offset, offset + BATCH_SIZE - 1);
    if (location_code) query = query.eq('location_code', location_code);
    if (sku) query = query.eq('sku', sku);
    const { data, error } = await query;
    if (error) throw error;
    if (data?.length > 0) { allData.push(...data); offset += data.length; hasMore = data.length === BATCH_SIZE; }
    else hasMore = false;
  }
  console.log(`Fetched ${allData.length} records from aifo.fact_daily`);
  return allData;
}

async function loadSettings(supabase: any, companyId: string): Promise<Settings> {
  const { data, error } = await supabase.schema('aifo').from('system_settings').select('setting_key, setting_value').or(`company_id.is.null,company_id.eq.${companyId}`).order('company_id', { ascending: true, nullsFirst: true });
  if (error) throw error;
  const m = new Map<string, string>();
  for (const r of data || []) m.set(r.setting_key, r.setting_value);
  return {
    production_lead_time: parseFloat(m.get('production_lead_time_global') || '3'),
    shipping_lead_time: parseFloat(m.get('shipping_lead_time') || '2'),
    red_zone_percentage: parseFloat(m.get('red_zone_percentage') || '0.33'),
    yellow_zone_percentage: parseFloat(m.get('yellow_zone_percentage') || '0.66'),
    overstock_threshold: parseFloat(m.get('overstock_threshold') || '1.5'),
    accelerator_up_percentage: parseFloat(m.get('accelerator_up_percentage') || '0.4'),
    accelerator_down_percentage: parseFloat(m.get('accelerator_down_percentage') || '0.2'),
    acceleration_idle_days: parseInt(m.get('acceleration_idle_days') || '3'),
    accelerator_minimum_target: parseInt(m.get('accelerator_minimum_target') || '1'),
    min_order_qty: parseInt(m.get('min_order_qty') || '1'),
    order_multiple: parseInt(m.get('order_multiple') || '1'),
    // NEW: Load order_days setting (e.g., "mon,thu" or empty for daily)
    order_days: m.get('order_days') || '',
    // NEW: Load dynamic_period setting (default false for backward compatibility)
    dynamic_period: m.get('dynamic_period')?.toLowerCase() === 'true',
    // PLACEHOLDER: dynamic_initial_target (parked for future implementation)
    dynamic_initial_target: m.get('dynamic_initial_target')?.toLowerCase() === 'true',
  };
}

function groupBySkuLocation(data: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  for (const row of data) {
    const key = `${row.location_code}|${row.sku}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  for (const rows of groups.values()) rows.sort((a, b) => a.day.localeCompare(b.day));
  return groups;
}

function mapRowToSkuLocDate(row: any, settings: Settings, isFirstDay: boolean): SkuLocDate {
  const leadTime = row.lead_time || (settings.production_lead_time + settings.shipping_lead_time);
  let target: number;
  if (isFirstDay && (row.target_units === null || row.target_units === 0 || row.target_units === undefined)) {
    target = Math.max((row.on_hand_units || 0) + (row.on_order_units || 0) + (row.in_transit_units || 0), settings.accelerator_minimum_target);
  } else {
    target = row.target_units || settings.accelerator_minimum_target;
  }
  return {
    day: row.day, location_code: row.location_code, sku: row.sku, company_id: row.company_id, dataset_id: row.dataset_id,
    units_sold: row.units_sold || 0, on_hand_units: row.on_hand_units || 0, on_order_units: row.on_order_units || 0, in_transit_units: row.in_transit_units || 0,
    on_hand_units_sim: row.on_hand_units_sim || row.on_hand_units || 0, on_order_units_sim: row.on_order_units_sim || 0, in_transit_units_sim: row.in_transit_units_sim || 0, target_units: target,
    dbm_zone: row.dbm_zone || null, dbm_zone_previous: row.dbm_zone_previous || null,
    red_threshold: Math.floor(target * settings.red_zone_percentage), yellow_threshold: Math.floor(target * settings.yellow_zone_percentage),
    counter_red: row.counter_red || 0, counter_green: row.counter_green || 0, counter_yellow: row.counter_yellow || 0, counter_overstock: row.counter_overstock || 0, stockout_days: row.stockout_days || 0,
    decision: row.decision || null, last_accelerated: row.last_accelerated || null, accelerator_condition: row.accelerator_condition || null,
    safety_level: row.safety_level || Math.max(1, Math.floor(target * settings.red_zone_percentage)), lead_time: leadTime, frozen: row.frozen || false, state: row.state || null,
  };
}
// Deployed Mon Dec 22 20:43:35 CET 2025
