import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const importSchema = z.object({
  csvText: z.string().min(1).max(5000000), // ~5MB limit
});

const salesRecordSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  store: z.string().trim().min(1, "Store code is required"),
  product: z.string().trim().min(1, "Product code is required"),
  units: z.string().transform(val => parseFloat(val)),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      throw new Error('Admin access required');
    }

    const body = await req.json();
    const { csvText } = importSchema.parse(body);

    // Parse CSV
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['day', 'store', 'product', 'units'];
    
    if (!requiredHeaders.every(h => headers.includes(h))) {
      throw new Error(`CSV must contain headers: ${requiredHeaders.join(', ')}`);
    }

    // Parse records
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const record: any = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx] || '';
      });
      
      try {
        const validated = salesRecordSchema.parse(record);
        records.push({
          d: validated.day,
          location_code: validated.store,
          sku: validated.product,
          units_sold: validated.units,
          on_hand_units: null,
          on_order_units: 0,
          in_transit_units: 0,
          on_hand_units_sim: null,
          target_units: null,
          economic_units: null,
          economic_overstock_units: null,
        });
      } catch (e: any) {
        throw new Error(`Row ${i + 1}: ${e.message}`);
      }
    }

    if (records.length === 0) {
      throw new Error('No valid records found in CSV');
    }

    // Verify locations and products exist
    const storeCodes = [...new Set(records.map(r => r.location_code))];
    const productCodes = [...new Set(records.map(r => r.sku))];

    const { data: locations } = await supabase
      .from('locations')
      .select('code')
      .in('code', storeCodes);

    const { data: products } = await supabase
      .from('products')
      .select('sku')
      .in('sku', productCodes);

    const existingStores = new Set(locations?.map(l => l.code) || []);
    const existingProducts = new Set(products?.map(p => p.sku) || []);

    const invalidStores = storeCodes.filter(s => !existingStores.has(s));
    const invalidProducts = productCodes.filter(p => !existingProducts.has(p));

    if (invalidStores.length > 0) {
      throw new Error(`Unknown store codes: ${invalidStores.join(', ')}`);
    }
    if (invalidProducts.length > 0) {
      throw new Error(`Unknown product codes: ${invalidProducts.join(', ')}`);
    }

    // Batch insert via RPC
    const BATCH_SIZE = 1000;
    let totalInserted = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.rpc('insert_fact_daily_batch', {
        records: batch
      });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Database error: ${insertError.message}`);
      }
      totalInserted += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${totalInserted} sales record(s)`,
        count: totalInserted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Import sales error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Import failed' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});