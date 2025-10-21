import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { csvText } = await req.json();

    if (!csvText) {
      return new Response(
        JSON.stringify({ error: 'CSV text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse CSV (skip header)
    const lines = csvText.trim().split('\n');
    const dataLines = lines.slice(1); // Skip header

    const batchSize = 1000;
    let totalInserted = 0;
    
    for (let i = 0; i < dataLines.length; i += batchSize) {
      const batch = dataLines.slice(i, i + batchSize);
      const records = batch.map((line: string) => {
        const parts = line.split(',');
        // Data_SkuLocDate.csv format:
        // ExecutionDate, StoreCode, ProductCode, UnitSales, UnitOnHand, UnitOnOrder, UnitInTransit,
        // UnitOnHandSimulated, Green (target), UnitsEco (economic), UnitsEcoOverstock
        
        // Extract date from timestamp format "2023-01-01 00:00:00" -> "2023-01-01"
        const dateStr = parts[0].trim().split(' ')[0];
        
        return {
          d: dateStr,
          location_code: parts[1].trim().replace('.0', ''),
          sku: parts[2].trim().replace('.0', ''),
          units_sold: parts[3].trim() || '0',
          on_hand_units: parts[4].trim() || '',
          on_order_units: parts[5].trim() || '0',
          in_transit_units: parts[6].trim() || '0',
          on_hand_units_sim: parts[7].trim() || '',
          target_units: parts[8].trim() || '',  // Green
          economic_units: parts[9].trim() || '',  // UnitsEco
          economic_overstock_units: parts[10].trim() || ''  // UnitsEcoOverstock
        };
      });

      const { error } = await supabaseClient.rpc('insert_fact_daily_batch', {
        records
      });

      if (error) {
        console.error('Batch insert error:', error);
        return new Response(
          JSON.stringify({ error: `Failed at batch starting at row ${i}: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      totalInserted += records.length;
      console.log(`Inserted ${totalInserted} records so far...`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${totalInserted} records` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});