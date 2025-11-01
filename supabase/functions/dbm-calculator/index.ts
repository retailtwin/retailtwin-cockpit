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
      settings[row.setting_key] = parseFloat(row.setting_value as string); 
    });

    console.log('Settings loaded:', settings);

    // Fetch data from aifo schema
    let query = supabase
      .from('fact_daily')
      .select('*')
      .gte('d', start_date)
      .lte('d', end_date);
    
    if (location_code !== 'ALL') query = query.eq('location_code', location_code);
    if (sku !== 'ALL') query = query.eq('sku', sku);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching fact_daily:', error);
      throw error;
    }

    console.log(`Processing ${data?.length || 0} records`);

    // Process each record
    const engine = new DBMEngine();
    const results = (data || []).map(row => {
      const input: SkuLocDate = {
        store_code: row.location_code,
        product_code: row.sku,
        execution_date: row.d,
        unit_on_hand: row.on_hand_units || 0,
        unit_on_order: row.on_order_units || 0,
        unit_in_transit: row.in_transit_units || 0,
        unit_sales: row.units_sold || 0,
        lead_time: settings.production_lead_time_global + settings.transport_lead_time_global || 10,
        excluded_level: 0,
        safety_level: Math.ceil((row.target_units || 0) * 0.5),
        green: row.target_units || 0,
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
        average_weekly_sales_units: (row.units_sold || 0) * 7,
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

    // Update database in batches
    const batchSize = 100;
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      
      for (const r of batch) {
        const { error: updateError } = await supabase
          .from('fact_daily')
          .update({
            target_units: r.green,
            economic_units: r.units_economic,
            economic_overstock_units: r.units_economic_overstock,
          })
          .eq('location_code', r.store_code)
          .eq('sku', r.product_code)
          .eq('d', r.execution_date);
        
        if (updateError) {
          console.error('Update error for record:', r.store_code, r.product_code, r.execution_date, updateError);
        }
      }
      
      console.log(`Updated batch ${i / batchSize + 1} of ${Math.ceil(results.length / batchSize)}`);
    }

    const summary = {
      processed: results.length,
      increases: results.filter(r => r.decision === 'inc_from_red').length,
      decreases: results.filter(r => r.decision === 'dec_from_green').length,
      new_items: results.filter(r => r.decision === 'new').length,
      avg_green: Math.round(results.reduce((sum, r) => sum + (r.green || 0), 0) / results.length),
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
