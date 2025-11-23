import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate CSV from array of objects
const generateCSV = (headers: string[], rows: any[]): string => {
  const headerLine = headers.join(',');
  const dataLines = rows.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Quote values that contain commas or quotes
      if (value === null || value === undefined) return '';
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',');
  });
  
  return [headerLine, ...dataLines].join('\n');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { datasetId, fileType } = await req.json();

    if (!datasetId || !fileType) {
      throw new Error('Missing datasetId or fileType');
    }

    console.log(`Exporting ${fileType} data for dataset ${datasetId}`);

    // Verify dataset exists and user has access
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single();

    if (datasetError || !dataset) {
      throw new Error('Dataset not found or access denied');
    }

    // Only allow export for template datasets or user's own datasets
    if (!dataset.is_template && dataset.user_id !== user.id) {
      throw new Error('Access denied');
    }

    let csvContent = '';
    let filename = '';

    switch (fileType) {
      case 'locations': {
        const { data, error } = await supabase
          .from('aifo.locations')
          .select('code, name, production_lead_time, shipping_lead_time, order_days')
          .eq('dataset_id', datasetId)
          .order('code');

        if (error) throw error;

        const headers = ['store_code', 'name', 'production_lead_time', 'shipping_lead_time', 'order_days'];
        const rows = (data || []).map(loc => ({
          store_code: loc.code,
          name: loc.name,
          production_lead_time: loc.production_lead_time,
          shipping_lead_time: loc.shipping_lead_time,
          order_days: loc.order_days,
        }));

        csvContent = generateCSV(headers, rows);
        filename = 'locations.csv';
        break;
      }

      case 'products': {
        const { data, error } = await supabase
          .from('aifo.products')
          .select('sku, name, unit_cost, unit_price, pack_size, minimum_order_quantity, group_1, group_2, group_3')
          .eq('dataset_id', datasetId)
          .order('sku');

        if (error) throw error;

        const headers = ['product_code', 'name', 'cost_price', 'sales_price', 'pack_size', 'minimum_order_quantity', 'group_1', 'group_2', 'group_3'];
        const rows = (data || []).map(prod => ({
          product_code: prod.sku,
          name: prod.name,
          cost_price: prod.unit_cost,
          sales_price: prod.unit_price,
          pack_size: prod.pack_size,
          minimum_order_quantity: prod.minimum_order_quantity,
          group_1: prod.group_1,
          group_2: prod.group_2,
          group_3: prod.group_3,
        }));

        csvContent = generateCSV(headers, rows);
        filename = 'products.csv';
        break;
      }

      case 'sales': {
        const { data, error } = await supabase
          .from('aifo.fact_daily')
          .select('d, location_code, sku, units_sold')
          .eq('dataset_id', datasetId)
          .not('units_sold', 'is', null)
          .gt('units_sold', 0)
          .order('d')
          .order('location_code')
          .order('sku')
          .limit(50000); // Limit for performance

        if (error) throw error;

        const headers = ['day', 'store', 'product', 'units'];
        const rows = (data || []).map(row => ({
          day: row.d,
          store: row.location_code,
          product: row.sku,
          units: row.units_sold,
        }));

        csvContent = generateCSV(headers, rows);
        filename = 'sales.csv';
        break;
      }

      case 'inventory': {
        const { data, error } = await supabase
          .from('aifo.fact_daily')
          .select('d, location_code, sku, on_hand_units, on_order_units, in_transit_units')
          .eq('dataset_id', datasetId)
          .not('on_hand_units', 'is', null)
          .order('d')
          .order('location_code')
          .order('sku')
          .limit(50000); // Limit for performance

        if (error) throw error;

        const headers = ['day', 'store', 'product', 'units_on_hand', 'units_on_order', 'units_in_transit'];
        const rows = (data || []).map(row => ({
          day: row.d,
          store: row.location_code,
          product: row.sku,
          units_on_hand: row.on_hand_units,
          units_on_order: row.on_order_units || 0,
          units_in_transit: row.in_transit_units || 0,
        }));

        csvContent = generateCSV(headers, rows);
        filename = 'inventory.csv';
        break;
      }

      default:
        throw new Error(`Unknown file type: ${fileType}`);
    }

    // Upload the generated CSV to storage
    const filePath = `${user.id}/${datasetId}/${fileType}_exported_${Date.now()}.csv`;
    const { error: uploadError } = await supabase.storage
      .from('dataset-files')
      .upload(filePath, new Blob([csvContent], { type: 'text/csv' }));

    if (uploadError) throw uploadError;

    // Update dataset with filename
    const updateField = `${fileType}_filename`;
    const { error: updateError } = await supabase
      .from('datasets')
      .update({ [updateField]: filePath })
      .eq('id', datasetId);

    if (updateError) throw updateError;

    console.log(`Exported ${fileType} data to ${filePath}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully exported ${fileType} data`,
        filePath,
        filename,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Export failed' }),
      { 
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});