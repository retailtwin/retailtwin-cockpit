import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts';
import { DBMEngine, calculateEconomicUnits } from './dbm-engine.ts';
import type { SkuLocDate } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const calculatorSchema = z.object({
  location_code: z.string()
    .regex(/^[A-Z0-9_-]+$|^ALL$/, 'Invalid location code format')
    .max(50, 'Location code too long'),
  sku: z.string()
    .regex(/^[A-Z0-9_-]+$|^ALL$/, 'Invalid SKU format')
    .max(50, 'SKU too long'),
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
    .refine(date => {
      const d = new Date(date);
      return d >= new Date('2020-01-01') && d <= new Date('2030-12-31');
    }, 'Date must be between 2020-01-01 and 2030-12-31'),
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
    .refine(date => {
      const d = new Date(date);
      return d >= new Date('2020-01-01') && d <= new Date('2030-12-31');
    }, 'Date must be between 2020-01-01 and 2030-12-31')
}).refine(data => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  return start <= end;
}, 'Start date must be before or equal to end date');

// Error sanitization function
function sanitizeError(error: unknown, operation: string, supportId: string): object {
  // Log full error server-side for debugging
  console.error(`[${operation}] Internal error [${supportId}]:`, error);
  
  const genericErrors: Record<string, string> = {
    'calculation': 'Calculation failed. Please try again or contact support.',
    'validation': 'Invalid input provided. Please check your parameters.',
    'database': 'Database operation failed. Please contact support.',
    'auth': 'Authentication failed. Please verify your credentials.'
  };
  
  return {
    error: genericErrors[operation] || 'An error occurred',
    code: operation.toUpperCase() + '_ERROR',
    support_id: supportId
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuthClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for admin role (required for this function)
    const { data: isAdmin, error: roleError } = await supabaseAuthClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = calculatorSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { location_code, sku, start_date, end_date } = validationResult.data;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`DBM Calculation starting for location: ${location_code}, SKU: ${sku}, dates: ${start_date} to ${end_date}`);

    // Fetch settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .eq('scope', 'global');
    
    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw settingsError;
    }

    const settings: any = {};
    settingsData?.forEach(row => { 
      const key = row.setting_key;
      const value = row.setting_value as string;
      
      // Parse numeric settings
      if (key.includes('percentage') || key.includes('lead_time') || key.includes('days')) {
        settings[key] = parseFloat(value);
      } else if (key.includes('dynamic') || key.includes('start_of') || key.includes('unhide') || key.includes('show_')) {
        // Parse boolean settings
        settings[key] = value === 'true' || value === '1';
      } else {
        settings[key] = value;
      }
    });

    console.log('Settings loaded:', settings);

    // Fetch data using RPC function that has access to aifo schema
    const { data, error } = await supabase.rpc('get_fact_daily_raw', {
      p_location_code: location_code,
      p_sku: sku,
      p_start_date: start_date,
      p_end_date: end_date
    });
    
    if (error) {
      console.error('Error fetching fact_daily:', error);
      throw error;
    }

    console.log(`Processing ${data?.length || 0} records`);

    // Organize data by SKU-Location and calculate rolling averages
    const salesBySkuLoc = new Map<string, any[]>();
    (data || []).forEach((row: any) => {
      const key = `${row.location_code}_${row.sku}`;
      if (!salesBySkuLoc.has(key)) {
        salesBySkuLoc.set(key, []);
      }
      salesBySkuLoc.get(key)!.push(row);
    });

    // Calculate 7-day rolling average for each SKU-Location
    salesBySkuLoc.forEach((rows) => {
      rows.sort((a: any, b: any) => new Date(a.d).getTime() - new Date(b.d).getTime());
      rows.forEach((row: any, idx: number) => {
        const start = Math.max(0, idx - 6);
        const window = rows.slice(start, idx + 1);
        const avgDailySales = window.reduce((sum: number, r: any) => sum + (r.units_sold || 0), 0) / window.length;
        row.avg_weekly_sales = avgDailySales * 7;
      });
    });

    // Process each SKU-Location group sequentially, maintaining state
    const engine = new DBMEngine();
    const results: any[] = [];

    // Order tracking structure
    interface PendingOrder {
      quantity: number;
      arrival_date: string;
      sku: string;
      location: string;
    }

    salesBySkuLoc.forEach((rows, key) => {
      let previousCalculated: SkuLocDate | null = null;
      let sim_inventory = 0;
      const sku_location_orders: PendingOrder[] = [];
      
      rows.forEach((row: any, idx: number) => {
        // Initialize sim_inventory on first day
        if (idx === 0) {
          sim_inventory = row.on_hand_units || 0;
        }
        
        // Step 1: Check for arriving orders
        const arrivingOrders = sku_location_orders.filter(o => o.arrival_date === row.d);
        const arrivals = arrivingOrders.reduce((sum, o) => sum + o.quantity, 0);
        sim_inventory += arrivals;
        
        // Remove arrived orders from queue
        sku_location_orders.splice(0, sku_location_orders.length, 
          ...sku_location_orders.filter(o => o.arrival_date !== row.d));
        
        // Step 2: Deduct sales from simulated inventory
        sim_inventory = Math.max(0, sim_inventory - (row.units_sold || 0));
        // Calculate economic units
        const economicUnits = Math.max(0, 
          (row.on_hand_units || 0) + 
          (row.on_order_units || 0) + 
          (row.in_transit_units || 0)
        );

        // Phase 1: Fix initial target - use economicUnits with minimum of 1
        const minimumTarget = settings.accelerator_minimum_target || 1;
        let initialGreen: number;
        if (idx === 0) {
          // First date: use economic units (with minimum enforced)
          initialGreen = Math.max(economicUnits, minimumTarget);
        } else {
          // Subsequent dates: use previous day's calculated green
          initialGreen = previousCalculated!.green || minimumTarget;
        }

        const input: SkuLocDate = {
          store_code: row.location_code,
          product_code: row.sku,
          execution_date: row.d,
          unit_on_hand: row.on_hand_units || 0,
          unit_on_order: row.on_order_units || 0,
          unit_in_transit: row.in_transit_units || 0,
          unit_sales: row.units_sold || 0,
          lead_time: (settings.production_lead_time_global || 0) + (settings.shipping_lead_time || 0) || 10,
          excluded_level: 0,
          safety_level: previousCalculated?.safety_level || Math.ceil(initialGreen * 0.5),
          green: initialGreen,
          yellow: previousCalculated?.yellow || 0,
          red: previousCalculated?.red || 0,
          dbm_zone: '',
          dbm_zone_previous: previousCalculated?.dbm_zone || '',
          counter_green: previousCalculated?.counter_green || 0,
          counter_yellow: previousCalculated?.counter_yellow || 0,
          counter_red: previousCalculated?.counter_red || 0,
          counter_overstock: previousCalculated?.counter_overstock || 0,
          decision: idx === 0 ? 'new' : (previousCalculated?.decision || 'new'),
          frozen: false,
          state: previousCalculated?.state || 'new',
          last_accelerated: previousCalculated?.last_accelerated || '2000-01-01',
          last_decrease: previousCalculated?.last_decrease || '2000-01-01',
          last_increase: previousCalculated?.last_increase || '2000-01-01',
          last_manual: previousCalculated?.last_manual || '2000-01-01',
          last_non_overstock: previousCalculated?.last_non_overstock || row.d,
          last_out_of_red: previousCalculated?.last_out_of_red || '2000-01-01',
          
          // Phase 3: Use configurable accelerator settings
          responsiveness_up_percentage: settings.accelerator_up_percentage ?? 0.4,
          responsiveness_down_percentage: settings.accelerator_down_percentage ?? 0.2,
          responsiveness_idle_days: settings.acceleration_idle_days ?? 3,
          average_weekly_sales_units: row.avg_weekly_sales || 0,
          
          // Phase 3: Add magnitude multipliers
          accelerator_up_multiplier: settings.accelerator_up_multiplier ?? 1.0,
          accelerator_down_multiplier: settings.accelerator_down_multiplier ?? 0.67,
          
          // Phase 3: Add safety guards
          accelerator_requires_inventory: settings.accelerator_requires_inventory ?? true,
          accelerator_minimum_target: minimumTarget,
          accelerator_enable_zero_sales: settings.accelerator_enable_zero_sales ?? true,
          
          units_economic: 0,
          units_economic_overstock: 0,
          units_economic_understock: 0,
        };

        // Log before DBM calculation
        console.log(`Day ${idx + 1} ${row.location_code}/${row.sku} IN: avg_weekly=${(row.avg_weekly_sales || 0).toFixed(2)}, green_in=${initialGreen}, sales=${row.units_sold}, on_hand=${row.unit_on_hand}`);
        
        const calculated = engine.executeDBMAlgorithm(input);
        const economics = calculateEconomicUnits(calculated);
        calculated.units_economic = economics.economic;
        calculated.units_economic_overstock = economics.overstock;
        calculated.units_economic_understock = economics.understock;
        
        // Log after DBM calculation
        console.log(`Day ${idx + 1} ${row.location_code}/${row.sku} OUT: green_out=${calculated.green}, decision=${calculated.decision}, state=${calculated.state}, zone=${calculated.dbm_zone}`);
        
        // Step 4: Check if order is needed
        const pending_orders = sku_location_orders.reduce((sum, o) => sum + o.quantity, 0);
        const position = sim_inventory + pending_orders;
        
        if (position < calculated.green!) {
          // Place order
          const order_qty = calculated.green! - position;
          const leadTime = input.lead_time;
          const arrival = new Date(row.d);
          arrival.setDate(arrival.getDate() + leadTime);
          const arrival_date = arrival.toISOString().split('T')[0];
          
          sku_location_orders.push({
            quantity: order_qty,
            arrival_date: arrival_date,
            sku: row.sku,
            location: row.location_code
          });
          
          console.log(`ORDER: ${row.location_code}/${row.sku} on ${row.d}: qty=${order_qty}, arrives=${arrival_date}, target=${calculated.green}, sim_inv=${sim_inventory}`);
        }
        
        // Step 5: Store simulated inventory for this day
        calculated.on_hand_units_sim = sim_inventory;
        
        previousCalculated = calculated;
        results.push(calculated);
      });
    });

    console.log(`Calculated ${results.length} records, updating database...`);

    // Prepare updates for batch RPC call
    const updates = results.map((r: any) => ({
      location_code: r.store_code,
      sku: r.product_code,
      d: r.execution_date,
      on_hand_units_sim: r.on_hand_units_sim,
      target_units: r.green,
      economic_units: r.units_economic,
      economic_overstock_units: r.units_economic_overstock,
    }));

    // Update database using RPC function
    const { error: updateError } = await supabase.rpc('update_fact_daily_batch', {
      updates: updates
    });
    
    if (updateError) {
      console.error('Batch update error:', updateError);
      throw updateError;
    }
    
    console.log('Database updated successfully');

    const summary = {
      processed: results.length,
      increases: results.filter((r: any) => r.decision === 'inc_from_red').length,
      decreases: results.filter((r: any) => r.decision === 'dec_from_green').length,
      new_items: results.filter((r: any) => r.decision === 'new').length,
      avg_green: Math.round(results.reduce((sum: number, r: any) => sum + (r.green || 0), 0) / results.length),
    };

    console.log('DBM Calculation complete:', summary);

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const supportId = crypto.randomUUID();
    return new Response(
      JSON.stringify(sanitizeError(error, 'calculation', supportId)),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
