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
        const [d, location_code, sku, units_sold, on_hand_units, on_order_units, in_transit_units, on_hand_units_sim] = line.split(',');
        
        return {
          d,
          location_code: location_code.replace('.0', ''),
          sku: sku.replace('.0', ''),
          units_sold: units_sold || '0',
          on_hand_units: on_hand_units || '',
          on_order_units: on_order_units || '0',
          in_transit_units: in_transit_units || '0',
          on_hand_units_sim: on_hand_units_sim || '',
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