import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DBMEngine, calculateEconomicUnits } from './dbm-engine.ts';
import type { SkuLocDate } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { location_code = 'ALL', sku = 'ALL', start_date, end_date } = await req.json();

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

    // Process each record
    const engine = new DBMEngine();
    const results = (data || []).map((row: any) => {
      // Calculate economic units first (for initialization)
      const economicUnits = Math.max(0, 
        (row.on_hand_units || 0) + 
        (row.on_order_units || 0) + 
        (row.in_transit_units || 0)
      );

      // Initialize Green to Economic Units if not set
      const initialGreen = row.target_units || economicUnits || 1;

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
        safety_level: Math.ceil(initialGreen * 0.5),
        green: initialGreen,
        yellow: 0,
        red: 0,
        dbm_zone: '',
        dbm_zone_previous: '',
        counter_green: 0,
        counter_yellow: 0,
        counter_red: 0,
        counter_overstock: 0,
        decision: 'new',
        frozen: false,
        state: 'new',
        last_accelerated: '2000-01-01',
        last_decrease: '2000-01-01',
        last_increase: '2000-01-01',
        last_manual: '2000-01-01',
        last_non_overstock: row.d,
        last_out_of_red: '2000-01-01',
        responsiveness_up_percentage: settings.accelerator_up_percentage || 0.3,
        responsiveness_down_percentage: settings.accelerator_down_percentage || 0.5,
        responsiveness_idle_days: settings.acceleration_idle_days || 3,
        average_weekly_sales_units: row.avg_weekly_sales || 0,
        units_economic: 0,
        units_economic_overstock: 0,
        units_economic_understock: 0,
      };

      const calculated = engine.executeDBMAlgorithm(input);
      const economics = calculateEconomicUnits(calculated);
      calculated.units_economic = economics.economic;
      calculated.units_economic_overstock = economics.overstock;
      calculated.units_economic_understock = economics.understock;
      
      return calculated;
    });

    console.log(`Calculated ${results.length} records, updating database...`);

    // Prepare updates for batch RPC call
    const updates = results.map((r: any) => ({
      location_code: r.store_code,
      sku: r.product_code,
      d: r.execution_date,
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
    console.error('DBM Calculation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
