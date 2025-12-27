// index.ts - DBM Edge Function Entry Point
// Version: 2025-12-27 v7 - Simplified, always starts with on-hand
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DBMEngine, createDBMEngine } from './dbm-engine.ts';
import type { SkuLocDay } from './dbm-engine.ts';

// ============================================================================
// TYPES
// ============================================================================

interface Settings {
  company_id: string;
  production_lead_time: number;
  shipping_lead_time: number;
  accelerator_up_percentage: number;
  accelerator_down_percentage: number;
  accelerator_idle_days: number;
  order_days: string;
  minimum_order_quantity: number;
  pack_size: number;
}

interface FactDailyRow {
  company_id: string;
  location_code: string;
  sku: string;
  day: string;
  units_sold: number | null;
  on_hand_units: number | null;
  on_order_units: number | null;
  in_transit_units: number | null;
  target_units: number | null;
  average_weekly_sales_units: number | null;
}

interface Order {
  creation_date: string;
  units_ordered: number;
  units_on_order: number;
  units_in_transit: number;
  move_on_order_to_in_transit_date: string;
  store_receive_date: string;
}

interface SkuLocationKPIs {
  sku: string;
  location_code: string;
  total_days: number;
  active_days: number;
  stockout_days: number;
  days_in_red: number;
  days_in_yellow: number;
  days_in_green: number;
  days_in_overstock: number;
  orders_placed: number;
  buffer_increases: number;
  buffer_decreases: number;
  total_units_sold: number;
  sum_daily_inventory: number;
  average_inventory: number;
  final_target: number;
  service_level: number;
  inventory_turns: number;
  has_stock_on_last_day: boolean;
  first_activity_date: string | null;
}

interface ResultRecord {
  company_id: string;
  location_code: string;
  sku: string;
  day: string;
  target_units: number;
  dbm_zone: string;
  dbm_zone_previous: string | null;
  on_hand_units_sim: number;
  on_order_units_sim: number;
  in_transit_units_sim: number;
  counter_green: number;
  counter_red: number;
  stockout_days: number;
  decision: string | null;
  state: string;
  last_out_of_red: string | null;
  last_decrease: string | null;
  last_non_overstock: string | null;
  last_accelerated: string | null;
  accelerator_condition: string | null;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { company_id, settings: inputSettings } = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'aifo' } });

    console.log('=== DBM v7 (2025-12-27) RUNNING ===');

    // Build settings with defaults
    const settings: Settings = {
      company_id,
      production_lead_time: inputSettings?.production_lead_time ?? 2,
      shipping_lead_time: inputSettings?.shipping_lead_time ?? 3,
      accelerator_up_percentage: inputSettings?.accelerator_up_percentage ?? 0.4,
      accelerator_down_percentage: inputSettings?.accelerator_down_percentage ?? 0.2,
      accelerator_idle_days: inputSettings?.accelerator_idle_days ?? 3,
      order_days: inputSettings?.order_days ?? '',
      minimum_order_quantity: inputSettings?.minimum_order_quantity ?? 1,
      pack_size: inputSettings?.pack_size ?? 1,
    };

    const leadTime = settings.production_lead_time + settings.shipping_lead_time;

    // Fetch data - remove the SKU filter for production
    const { data: rawData, error: fetchError } = await supabase
      .from('fact_daily')
      .select('*')
      .eq('company_id', company_id)
      // .eq('sku', '31241 - 4365 Individual 10 Knee-Highs gobi S')  // TEST: Remove for production
      .limit(50000)
      .order('sku', { ascending: true })
      .order('location_code', { ascending: true })
      .order('day', { ascending: true });

    if (fetchError) throw fetchError;
    if (!rawData || rawData.length === 0) {
      return new Response(JSON.stringify({ error: 'No data found' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 404 
      });
    }

    console.log(`Processing ${rawData.length} rows for company ${company_id}`);

    // Group by SKU-Location
    const groups = groupBySkuLocation(rawData);

    // Create DBM Engine with settings
    const engine = createDBMEngine({
      lead_time: leadTime,
      responsiveness_up_percentage: settings.accelerator_up_percentage,
      responsiveness_down_percentage: settings.accelerator_down_percentage,
      responsiveness_idle_days: settings.accelerator_idle_days,
    });

    // Process each SKU-Location
    const results: ResultRecord[] = [];
    const allKPIs: SkuLocationKPIs[] = [];
    let totalIncreases = 0, totalDecreases = 0, totalOrders = 0;

    for (const [key, rows] of groups) {
      const { records, kpis } = processSkuLocation(rows, settings, engine);
      results.push(...records);
      allKPIs.push(kpis);
      totalIncreases += kpis.buffer_increases;
      totalDecreases += kpis.buffer_decreases;
      totalOrders += kpis.orders_placed;
    }

    console.log(`Processed ${results.length} records, ${totalIncreases} increases, ${totalDecreases} decreases`);

    // Write results to database
    const updateCount = await writeResults(supabase, results);

    return new Response(JSON.stringify({
      success: true,
      summary: { 
        total_records: results.length, 
        sku_locations: groups.size, 
        buffer_increases: totalIncreases, 
        buffer_decreases: totalDecreases, 
        orders_created: totalOrders, 
        records_updated: updateCount 
      },
      kpis: allKPIs,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('DBM Calculator error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 500 
    });
  }
});

// ============================================================================
// PROCESSING FUNCTIONS
// ============================================================================

function groupBySkuLocation(data: FactDailyRow[]): Map<string, FactDailyRow[]> {
  const groups = new Map<string, FactDailyRow[]>();
  for (const row of data) {
    const key = `${row.sku}|${row.location_code}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  return groups;
}

function processSkuLocation(
  rows: FactDailyRow[], 
  settings: Settings, 
  engine: DBMEngine
): { records: ResultRecord[]; kpis: SkuLocationKPIs } {
  
  const records: ResultRecord[] = [];
  const orders: Order[] = [];
  
  // KPI counters
  let daysInRed = 0, daysInYellow = 0, daysInGreen = 0, daysInOverstock = 0;
  let bufferIncreases = 0, bufferDecreases = 0, ordersPlaced = 0;
  let totalUnitsSold = 0, sumDailyInventory = 0, stockoutDays = 0;
  let firstActivityDate: string | null = null;

  // Sort by day
  rows.sort((a, b) => a.day.localeCompare(b.day));

  // Simulation state
  let onHandSim = 0;
  let onOrderSim = 0;
  let inTransitSim = 0;
  let dbmState: SkuLocDay | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const onHand = row.on_hand_units || 0;
    const unitsSold = row.units_sold || 0;
    const avgWeeklySales = row.average_weekly_sales_units || 0;

    // Process arriving orders
    const arriving = orders.filter(o => o.store_receive_date === row.day);
    for (const order of arriving) {
      onHandSim += order.units_in_transit;
      order.units_in_transit = 0;
    }

    // Apply sales
    const actualSales = Math.min(unitsSold, onHandSim);
    onHandSim -= actualSales;
    if (onHandSim < 0) onHandSim = 0;

    // Run DBM algorithm
    const skuLocKey = `${row.sku}|${row.location_code}`;
    
    if (i === 0) {
      // Day 1: Initialize with on-hand (ALWAYS)
      onHandSim = onHand;
      dbmState = engine.initializeDay1(skuLocKey, row.day, onHand);
      dbmState.average_weekly_sales_units = avgWeeklySales;
    } else {
      // Day 2+: Process with engine
      dbmState = engine.processDay(dbmState!, row.day, onHandSim, avgWeeklySales);
    }

    // Process orders moving to in-transit
    const transit = orders.filter(o => o.move_on_order_to_in_transit_date === row.day);
    for (const order of transit) {
      order.units_in_transit = order.units_on_order;
      order.units_on_order = 0;
    }

    // Create new order if needed
    const newOrder = createOrder(row.day, onHandSim, onOrderSim, inTransitSim, dbmState.target_units, settings);
    if (newOrder) {
      orders.push(newOrder);
      ordersPlaced++;
    }

    // Update simulated inventory position
    onOrderSim = orders.reduce((sum, o) => sum + o.units_on_order, 0);
    inTransitSim = orders.reduce((sum, o) => sum + o.units_in_transit, 0);

    // Track KPIs
    if (dbmState.dbm_zone === 'red') daysInRed++;
    else if (dbmState.dbm_zone === 'yellow') daysInYellow++;
    else if (dbmState.dbm_zone === 'green') daysInGreen++;
    else if (dbmState.dbm_zone === 'overstock') daysInOverstock++;

    if (dbmState.decision === 'inc_from_red' || dbmState.decision === 'increase') bufferIncreases++;
    if (dbmState.decision === 'dec_from_green' || dbmState.decision === 'decrease') bufferDecreases++;

    totalUnitsSold += actualSales;
    sumDailyInventory += onHandSim;
    if (onHandSim === 0) stockoutDays++;
    if (firstActivityDate === null && (onHand > 0 || unitsSold > 0)) firstActivityDate = row.day;

    // Build result record
    records.push({
      company_id: row.company_id,
      location_code: row.location_code,
      sku: row.sku,
      day: row.day,
      target_units: dbmState.target_units,
      dbm_zone: dbmState.dbm_zone,
      dbm_zone_previous: dbmState.dbm_zone_previous,
      on_hand_units_sim: onHandSim,
      on_order_units_sim: onOrderSim,
      in_transit_units_sim: inTransitSim,
      counter_green: dbmState.counter_green,
      counter_red: dbmState.counter_red,
      stockout_days: stockoutDays,
      decision: dbmState.decision,
      state: 'active',
      last_out_of_red: dbmState.last_out_of_red,
      last_decrease: dbmState.last_decrease,
      last_non_overstock: dbmState.last_non_overstock,
      last_accelerated: dbmState.last_accelerated,
      accelerator_condition: null,
    });
  }

  // Calculate final KPIs
  const lastState = dbmState!;
  const activeDays = records.length;
  const avgInventory = activeDays > 0 ? sumDailyInventory / activeDays : 0;
  const serviceLevel = activeDays > 0 ? ((activeDays - stockoutDays) / activeDays) * 100 : 0;
  const inventoryTurns = avgInventory > 0 ? totalUnitsSold / avgInventory : 0;

  return {
    records,
    kpis: {
      sku: rows[0].sku,
      location_code: rows[0].location_code,
      total_days: rows.length,
      active_days: activeDays,
      stockout_days,
      days_in_red: daysInRed,
      days_in_yellow: daysInYellow,
      days_in_green: daysInGreen,
      days_in_overstock: daysInOverstock,
      orders_placed: ordersPlaced,
      buffer_increases: bufferIncreases,
      buffer_decreases: bufferDecreases,
      total_units_sold: totalUnitsSold,
      sum_daily_inventory: sumDailyInventory,
      average_inventory: avgInventory,
      final_target: lastState.target_units,
      service_level: serviceLevel,
      inventory_turns: inventoryTurns,
      has_stock_on_last_day: onHandSim > 0,
      first_activity_date: firstActivityDate,
    }
  };
}

function createOrder(
  day: string,
  onHandSim: number,
  onOrderSim: number,
  inTransitSim: number,
  target: number,
  settings: Settings
): Order | null {
  // Check if today is an order day
  let isOrderDay = true;
  if (settings.order_days && settings.order_days.trim() !== '') {
    const dayAliases = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayAlias = dayAliases[new Date(day).getDay()];
    isOrderDay = settings.order_days.toLowerCase().includes(dayAlias);
  }

  const economicStock = onHandSim + onOrderSim + inTransitSim;
  let unitsToOrder = target - economicStock;

  if (unitsToOrder > 0 && isOrderDay) {
    if (unitsToOrder < settings.minimum_order_quantity) {
      unitsToOrder = settings.minimum_order_quantity;
    }
    unitsToOrder = Math.ceil(unitsToOrder / settings.pack_size) * settings.pack_size;

    const creationDate = new Date(day);
    const moveDate = new Date(creationDate);
    moveDate.setDate(moveDate.getDate() + settings.production_lead_time);
    const receiveDate = new Date(moveDate);
    receiveDate.setDate(receiveDate.getDate() + settings.shipping_lead_time);

    return {
      creation_date: day,
      units_ordered: unitsToOrder,
      units_on_order: unitsToOrder,
      units_in_transit: 0,
      move_on_order_to_in_transit_date: moveDate.toISOString().split('T')[0],
      store_receive_date: receiveDate.toISOString().split('T')[0],
    };
  }

  return null;
}

// ============================================================================
// DATABASE FUNCTIONS
// ============================================================================

async function writeResults(supabase: any, results: ResultRecord[]): Promise<number> {
  if (results.length === 0) return 0;

  const batchSize = 500;
  let totalUpdated = 0;

  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    
    const upsertData = batch.map(r => ({
      company_id: r.company_id,
      location_code: r.location_code,
      sku: r.sku,
      day: r.day,
      target_units: r.target_units,
      dbm_zone: r.dbm_zone,
      dbm_zone_previous: r.dbm_zone_previous,
      on_hand_units_sim: r.on_hand_units_sim,
      on_order_units_sim: r.on_order_units_sim,
      in_transit_units_sim: r.in_transit_units_sim,
      counter_green: r.counter_green,
      counter_red: r.counter_red,
      stockout_days: r.stockout_days,
      decision: r.decision,
      state: r.state,
      last_out_of_red: r.last_out_of_red,
      last_decrease: r.last_decrease,
      last_non_overstock: r.last_non_overstock,
      last_accelerated: r.last_accelerated,
      accelerator_condition: r.accelerator_condition,
    }));

    const { error } = await supabase
      .from('fact_daily')
      .upsert(upsertData, { onConflict: 'company_id,location_code,sku,day' });

    if (error) {
      console.error(`Batch error at ${i}:`, error);
      throw error;
    }

    totalUpdated += batch.length;
  }

  console.log(`Updated ${totalUpdated} records`);
  return totalUpdated;
}
