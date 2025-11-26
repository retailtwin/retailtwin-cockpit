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

const productRecordSchema = z.object({
  product_code: z.string().trim().min(1, "Product code is required"),
  name: z.string().trim().min(1, "Product name is required"),
  cost_price: z.string().transform(val => parseFloat(val)),
  sales_price: z.string().transform(val => parseFloat(val)),
  pack_size: z.string().optional().transform(val => val ? parseInt(val) : 1),
  minimum_order_quantity: z.string().optional().transform(val => val ? parseInt(val) : 1),
  group_1: z.string().optional(),
  group_2: z.string().optional(),
  group_3: z.string().optional(),
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
    const requiredHeaders = ['product_code', 'name', 'cost_price', 'sales_price'];
    
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
        const validated = productRecordSchema.parse(record);
        records.push(validated);
      } catch (e: any) {
        throw new Error(`Row ${i + 1}: ${e.message}`);
      }
    }

    if (records.length === 0) {
      throw new Error('No valid records found in CSV');
    }

    // Transform records to match database schema (product_code -> sku)
    const productRecords = records.map(r => ({
      sku: r.product_code,
      name: r.name,
      cost_price: r.cost_price,
      sales_price: r.sales_price,
      pack_size: r.pack_size,
      minimum_order_quantity: r.minimum_order_quantity,
      group_1: r.group_1,
      group_2: r.group_2,
      group_3: r.group_3
    }));

    // Deduplicate by SKU (keep last occurrence)
    const uniqueRecords = Array.from(
      productRecords.reduce((map, record) => {
        map.set(record.sku, record);
        return map;
      }, new Map()).values()
    );

    // Direct insert using Supabase client
    const { error: insertError } = await supabase
      .from('products')
      .upsert(uniqueRecords, { 
        onConflict: 'sku',
        ignoreDuplicates: false 
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Database error: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${records.length} product(s)`,
        count: records.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Import products error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Import failed' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});