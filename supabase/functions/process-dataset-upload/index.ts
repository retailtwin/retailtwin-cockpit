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

    // Process based on file type using RPC batch functions
    let countField = '';
    let rpcFunction = '';

    switch (fileType) {
      case 'locations':
        countField = 'total_locations';
        rpcFunction = 'upsert_locations_for_dataset';
        break;

      case 'products':
        countField = 'total_products';
        rpcFunction = 'upsert_products_for_dataset';
        break;

      case 'sales':
        countField = 'total_sales_records';
        rpcFunction = 'insert_sales_for_dataset';
        break;

      case 'inventory':
        countField = 'total_inventory_records';
        rpcFunction = 'upsert_inventory_for_dataset';
        break;

      default:
        throw new Error(`Unknown file type: ${fileType}`);
    }

    // Insert records in batches using RPC
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const { error: rpcError } = await supabase.rpc(rpcFunction, {
        records: batch,
        p_dataset_id: datasetId,
      });

      if (rpcError) {
        throw new Error(`Failed to process batch: ${rpcError.message}`);
      }
    }

    // Update dataset with record count and date range
    const updates: any = {
      [countField]: records.length,
      status: 'processed',
      processed_at: new Date().toISOString(),
    };

    // Calculate date range for sales/inventory
    if (fileType === 'sales' || fileType === 'inventory') {
      const dates = records.map(r => new Date(r.day || r.d)).filter(d => !isNaN(d.getTime()));
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
        message: `Successfully processed ${records.length} ${fileType} records`,
        recordCount: records.length,
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
