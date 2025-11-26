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

const locationRecordSchema = z.object({
  store_code: z.string().trim().min(1, "Store code is required"),
  name: z.string().trim().min(1, "Store name is required"),
  production_lead_time: z.string().optional().transform(val => val ? parseInt(val) : 0),
  shipping_lead_time: z.string().optional().transform(val => val ? parseInt(val) : 0),
  order_days: z.string().optional().default("mon,tue,wed,thu,fri,sat,sun"),
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { csvText } = importSchema.parse(body);

    // Parse CSV
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const expectedHeaders = ['store_code', 'name', 'production_lead_time', 'shipping_lead_time', 'order_days'];
    
    if (!expectedHeaders.every(h => headers.includes(h))) {
      throw new Error(`CSV must contain headers: ${expectedHeaders.join(', ')}`);
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
        const validated = locationRecordSchema.parse(record);
        records.push(validated);
      } catch (e: any) {
        throw new Error(`Row ${i + 1}: ${e.message}`);
      }
    }

    if (records.length === 0) {
      throw new Error('No valid records found in CSV');
    }

    // Transform records to match database schema (store_code -> code)
    const locationRecords = records.map(r => ({
      code: r.store_code,
      name: r.name,
      production_lead_time: r.production_lead_time,
      shipping_lead_time: r.shipping_lead_time,
      order_days: r.order_days
    }));

    // Direct insert using Supabase client
    const { error: insertError } = await supabase
      .from('locations')
      .upsert(locationRecords, { 
        onConflict: 'code',
        ignoreDuplicates: false 
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Database error: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${records.length} location(s)`,
        count: records.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Import locations error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Import failed' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});