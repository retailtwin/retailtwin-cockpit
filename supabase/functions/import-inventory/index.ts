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

const inventoryRecordSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  store: z.string().trim().min(1, "Store code is required"),
  product: z.string().trim().min(1, "Product code is required"),
  units_on_hand: z.string().transform(val => val ? parseFloat(val) : 0),
  units_on_order: z.string().optional().transform(val => val ? parseInt(val) : 0),
  units_in_transit: z.string().optional().transform(val => val ? parseInt(val) : 0),
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
    const requiredHeaders = ['day', 'store', 'product', 'units_on_hand'];
    
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
        const validated = inventoryRecordSchema.parse(record);
        records.push(validated);
      } catch (e: any) {
        throw new Error(`Row ${i + 1}: ${e.message}`);
      }
    }

    if (records.length === 0) {
      throw new Error('No valid records found in CSV');
    }

    // Verify locations and products exist
    const storeCodes = [...new Set(records.map(r => r.store))];
    const productCodes = [...new Set(records.map(r => r.product))];

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

    // Transform records to match fact_daily table schema
    const factDailyRecords = records.map(r => ({
      day: r.day,
      location_code: r.store,
      sku: r.product,
      units_on_hand: r.units_on_hand,
      units_on_order: r.units_on_order,
      units_in_transit: r.units_in_transit,
      units_sold: 0 // Inventory data doesn't include sales
    }));

    // Direct insert using Supabase client
    const { error: insertError } = await supabase
      .from('fact_daily')
      .upsert(factDailyRecords, { 
        onConflict: 'day,location_code,sku',
        ignoreDuplicates: false 
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Database error: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${records.length} inventory record(s)`,
        count: records.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Import inventory error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Import failed' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});