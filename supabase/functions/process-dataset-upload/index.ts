import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { datasetId, fileType } = await req.json();

    if (!datasetId || !fileType) {
      throw new Error('Missing datasetId or fileType');
    }

    // Get dataset and verify ownership
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .eq('user_id', user.id)
      .single();

    if (datasetError || !dataset) {
      throw new Error('Dataset not found or access denied');
    }

    // Get the file path from dataset
    const fileField = `${fileType}_filename`;
    const filePath = dataset[fileField];

    if (!filePath) {
      throw new Error(`No ${fileType} file uploaded for this dataset`);
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('dataset-files')
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert blob to text
    const csvText = await fileData.text();

    // Parse CSV
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const record: any = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || null;
      });
      records.push(record);
    }

    // Process based on file type
    let tableName = '';
    let processedRecords: any[] = [];
    let countField = '';

    switch (fileType) {
      case 'locations':
        tableName = 'aifo.locations';
        countField = 'total_locations';
        processedRecords = records.map(r => ({
          code: r.store_code,
          name: r.name,
          production_lead_time: parseInt(r.production_lead_time) || 0,
          shipping_lead_time: parseInt(r.shipping_lead_time) || 0,
          order_days: r.order_days || 'mon,tue,wed,thu,fri',
          dataset_id: datasetId,
        }));
        break;

      case 'products':
        tableName = 'aifo.products';
        countField = 'total_products';
        processedRecords = records.map(r => ({
          sku: r.product_code,
          name: r.name,
          unit_cost: parseFloat(r.cost_price) || 0,
          unit_price: parseFloat(r.sales_price) || 0,
          pack_size: parseInt(r.pack_size) || 1,
          minimum_order_quantity: parseInt(r.minimum_order_quantity) || 1,
          group_1: r.group_1 || null,
          group_2: r.group_2 || null,
          group_3: r.group_3 || null,
          dataset_id: datasetId,
        }));
        break;

      case 'sales':
        tableName = 'aifo.fact_daily';
        countField = 'total_sales_records';
        processedRecords = records.map(r => ({
          d: r.day || r.d,
          location_code: r.store || r.location_code,
          sku: r.product || r.sku,
          units_sold: parseFloat(r.units || r.units_sold) || 0,
          on_hand_units: parseFloat(r.on_hand_units) || null,
          dataset_id: datasetId,
        }));
        break;

      case 'inventory':
        tableName = 'aifo.fact_daily';
        countField = 'total_inventory_records';
        // For inventory, we need to upsert (update existing or insert new)
        processedRecords = records.map(r => ({
          d: r.day,
          location_code: r.store,
          sku: r.product,
          on_hand_units: parseFloat(r.units_on_hand) || 0,
          on_order_units: parseInt(r.units_on_order) || 0,
          in_transit_units: parseInt(r.units_in_transit) || 0,
          dataset_id: datasetId,
        }));
        break;

      default:
        throw new Error(`Unknown file type: ${fileType}`);
    }

    // Insert records in batches
    const batchSize = 100;
    for (let i = 0; i < processedRecords.length; i += batchSize) {
      const batch = processedRecords.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from(tableName.replace('aifo.', ''))
        .upsert(batch);

      if (insertError) {
        throw new Error(`Failed to insert batch: ${insertError.message}`);
      }
    }

    // Update dataset with record count and date range
    const updates: any = {
      [countField]: processedRecords.length,
      status: 'processed',
      processed_at: new Date().toISOString(),
    };

    // Calculate date range for sales/inventory
    if (fileType === 'sales' || fileType === 'inventory') {
      const dates = processedRecords.map(r => new Date(r.d)).filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        updates.date_range_start = new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0];
        updates.date_range_end = new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0];
      }
    }

    const { error: updateError } = await supabase
      .from('datasets')
      .update(updates)
      .eq('id', datasetId);

    if (updateError) {
      console.error('Failed to update dataset:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${processedRecords.length} ${fileType} records`,
        recordCount: processedRecords.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing dataset upload:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
