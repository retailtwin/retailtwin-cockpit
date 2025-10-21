import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { csvData } = await req.json();
    
    console.log('Starting import of fact_daily data...');
    
    // Parse CSV
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    
    // Process in batches of 1000
    const batchSize = 1000;
    let imported = 0;
    let batch: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      
      const record = {
        d: values[0],
        location_code: values[1].replace('.0', ''),
        sku: values[2].replace('.0', ''),
        units_sold: parseFloat(values[3]) || 0,
        on_hand_units: values[4] ? parseFloat(values[4]) : null,
        on_order_units: values[5] ? parseInt(values[5]) : null,
        in_transit_units: values[6] ? parseInt(values[6]) : null,
        on_hand_units_sim: values[7] ? parseFloat(values[7]) : null
      };
      
      batch.push(record);
      
      // Insert when batch is full
      if (batch.length >= batchSize) {
        const { error } = await supabaseClient
          .from('aifo.fact_daily')
          .insert(batch);
        
        if (error) {
          console.error('Batch insert error:', error);
          throw error;
        }
        
        imported += batch.length;
        console.log(`Imported ${imported} records...`);
        batch = [];
      }
    }
    
    // Insert remaining records
    if (batch.length > 0) {
      const { error } = await supabaseClient
        .from('aifo.fact_daily')
        .insert(batch);
      
      if (error) {
        console.error('Final batch insert error:', error);
        throw error;
      }
      
      imported += batch.length;
    }
    
    console.log(`Import complete! Total records: ${imported}`);
    
    return new Response(
      JSON.stringify({ success: true, imported }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error importing data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
