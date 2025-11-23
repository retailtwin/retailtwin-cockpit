import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for background processing
declare const EdgeRuntime: {
  waitUntil(promise: Promise<void>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Column mapping - flexible header recognition
const COLUMN_MAPPINGS: Record<string, string[]> = {
  // Locations
  store_code: ['store_code', 'location_code', 'code', 'store', 'location'],
  name: ['name', 'store_name', 'location_name'],
  production_lead_time: ['production_lead_time', 'prod_lead_time', 'production_lt'],
  shipping_lead_time: ['shipping_lead_time', 'ship_lead_time', 'shipping_lt'],
  order_days: ['order_days', 'ordering_days', 'days'],
  
  // Products
  product_code: ['product_code', 'sku', 'product', 'item_code'],
  product_name: ['name', 'product_name', 'item_name', 'description'],
  cost_price: ['cost_price', 'unit_cost', 'cost'],
  sales_price: ['sales_price', 'unit_price', 'price', 'retail_price'],
  pack_size: ['pack_size', 'pack', 'case_size'],
  minimum_order_quantity: ['minimum_order_quantity', 'moq', 'min_order', 'min_qty'],
  group_1: ['group_1', 'category', 'group1', 'cat1'],
  group_2: ['group_2', 'subcategory', 'group2', 'cat2'],
  group_3: ['group_3', 'subsubcategory', 'group3', 'cat3'],
  
  // Sales & Inventory
  day: ['day', 'd', 'date', 'transaction_date'],
  store: ['store', 'location_code', 'store_code', 'location'],
  product: ['product', 'sku', 'product_code', 'item'],
  units: ['units', 'quantity', 'qty', 'units_sold', 'sales'],
  units_on_hand: ['units_on_hand', 'on_hand', 'inventory', 'stock'],
  units_on_order: ['units_on_order', 'on_order', 'ordered'],
  units_in_transit: ['units_in_transit', 'in_transit', 'transit'],
};

// Map CSV headers to standard column names
const mapHeaders = (headers: string[]): Map<string, number> => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  const mapping = new Map<string, number>();
  
  for (const [standardName, variations] of Object.entries(COLUMN_MAPPINGS)) {
    for (const variation of variations) {
      const index = normalizedHeaders.indexOf(variation.toLowerCase());
      if (index !== -1) {
        mapping.set(standardName, index);
        break;
      }
    }
  }
  
  return mapping;
};

// Clean and normalize date format
const normalizeDate = (dateStr: string): string => {
  // Remove Excel formula prefix (="...") and quotes
  let cleaned = dateStr.replace(/^="|"$/g, '').trim();
  
  // Try to parse the date
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    // Return in YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  }
  
  return cleaned;
};

// Advanced CSV parsing that handles quotes and commas properly
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
};

// Generate normalized CSV
const generateNormalizedCSV = async (fileType: string, records: any[]): Promise<string> => {
  let headers: string[] = [];
  let rows: string[][] = [];
  
  switch (fileType) {
    case 'locations':
      headers = ['store_code', 'name', 'production_lead_time', 'shipping_lead_time', 'order_days'];
      rows = records.map(r => [
        r.store_code || '',
        r.name || '',
        String(r.production_lead_time || 0),
        String(r.shipping_lead_time || 0),
        r.order_days || 'mon,tue,wed,thu,fri,sat,sun'
      ]);
      break;
      
    case 'products':
      headers = ['product_code', 'name', 'cost_price', 'sales_price', 'pack_size', 'minimum_order_quantity', 'group_1', 'group_2', 'group_3'];
      rows = records.map(r => [
        r.product_code || '',
        r.name || '',
        String(r.cost_price || 0),
        String(r.sales_price || 0),
        String(r.pack_size || 1),
        String(r.minimum_order_quantity || 1),
        r.group_1 || '',
        r.group_2 || '',
        r.group_3 || ''
      ]);
      break;
      
    case 'sales':
      headers = ['day', 'store', 'product', 'units'];
      rows = records.map(r => [
        r.day || '',
        r.store || '',
        r.product || '',
        String(r.units || 0)
      ]);
      break;
      
    case 'inventory':
      headers = ['day', 'store', 'product', 'units_on_hand', 'units_on_order', 'units_in_transit'];
      rows = records.map(r => [
        r.day || '',
        r.store || '',
        r.product || '',
        String(r.units_on_hand || 0),
        String(r.units_on_order || 0),
        String(r.units_in_transit || 0)
      ]);
      break;
  }
  
  const csvLines = [headers.join(',')];
  for (const row of rows) {
    // Quote values that need it
    const quotedRow = row.map(val => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    csvLines.push(quotedRow.join(','));
  }
  
  return csvLines.join('\n');
};

// Deduplication helper
const deduplicateRecords = (type: string, items: any[]): any[] => {
  const map = new Map<string, any>();

  for (const item of items) {
    let key: string | null = null;

    switch (type) {
      case 'products': {
        const code = item.product_code ?? item.sku ?? null;
        key = code ? `product:${code}` : null;
        break;
      }
      case 'locations': {
        const storeCode = item.store_code ?? item.location_code ?? item.code ?? null;
        key = storeCode ? `location:${storeCode}` : null;
        break;
      }
      case 'sales': {
        const d = item.day ?? item.d ?? null;
        const store = item.store ?? item.location_code ?? null;
        const product = item.product ?? item.sku ?? null;
        key = d && store && product ? `sales:${d}:${store}:${product}` : null;
        break;
      }
      case 'inventory': {
        const d = item.day ?? item.d ?? null;
        const store = item.store ?? item.location_code ?? null;
        const product = item.product ?? item.sku ?? null;
        key = d && store && product ? `inventory:${d}:${store}:${product}` : null;
        break;
      }
      default:
        break;
    }

    if (key) {
      map.set(key, item);
    } else {
      map.set(`row:${map.size}`, item);
    }
  }

  return Array.from(map.values());
};

// Background processing function
async function processFileInBackground(
  supabase: any,
  params: { datasetId: string; fileType: string; filePath: string }
) {
  const { datasetId, fileType, filePath } = params;

  try {
    console.log(`Starting background processing for dataset ${datasetId}, type ${fileType}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('dataset-files')
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert blob to text
    const csvText = await fileData.text();

    // Parse CSV with proper quote handling
    const lines = csvText.trim().split('\n').filter((line: string) => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    // Parse headers and create mapping
    const rawHeaders = parseCSVLine(lines[0]);
    const headerMapping = mapHeaders(rawHeaders);
    
    console.log(`Found headers: ${rawHeaders.join(', ')}`);
    console.log(`Mapped to: ${Array.from(headerMapping.keys()).join(', ')}`);

    const records = [] as any[];

    // Parse each data row
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = parseCSVLine(lines[i]);
      const record: any = {};
      
      // Map values based on flexible header matching
      switch (fileType) {
        case 'locations': {
          const storeCodeIdx = headerMapping.get('store_code');
          const nameIdx = headerMapping.get('name');
          const prodLtIdx = headerMapping.get('production_lead_time');
          const shipLtIdx = headerMapping.get('shipping_lead_time');
          const orderDaysIdx = headerMapping.get('order_days');
          
          if (storeCodeIdx === undefined || nameIdx === undefined) {
            throw new Error(`Missing required columns: store_code and name must be present`);
          }
          
          record.store_code = values[storeCodeIdx]?.trim();
          record.name = values[nameIdx]?.trim();
          record.production_lead_time = prodLtIdx !== undefined ? (parseInt(values[prodLtIdx]) || 0) : 0;
          record.shipping_lead_time = shipLtIdx !== undefined ? (parseInt(values[shipLtIdx]) || 0) : 0;
          record.order_days = orderDaysIdx !== undefined ? values[orderDaysIdx]?.trim() : 'mon,tue,wed,thu,fri,sat,sun';
          break;
        }
        
        case 'products': {
          const productCodeIdx = headerMapping.get('product_code');
          const nameIdx = headerMapping.get('product_name') ?? headerMapping.get('name');
          const costIdx = headerMapping.get('cost_price');
          const priceIdx = headerMapping.get('sales_price');
          const packIdx = headerMapping.get('pack_size');
          const moqIdx = headerMapping.get('minimum_order_quantity');
          const g1Idx = headerMapping.get('group_1');
          const g2Idx = headerMapping.get('group_2');
          const g3Idx = headerMapping.get('group_3');
          
          if (productCodeIdx === undefined || nameIdx === undefined) {
            throw new Error(`Missing required columns: product_code and name must be present`);
          }
          
          record.product_code = values[productCodeIdx]?.trim();
          record.name = values[nameIdx]?.trim();
          record.cost_price = costIdx !== undefined ? parseFloat(values[costIdx]) : 0;
          record.sales_price = priceIdx !== undefined ? parseFloat(values[priceIdx]) : 0;
          record.pack_size = packIdx !== undefined ? (parseInt(values[packIdx]) || 1) : 1;
          record.minimum_order_quantity = moqIdx !== undefined ? (parseInt(values[moqIdx]) || 1) : 1;
          record.group_1 = g1Idx !== undefined ? values[g1Idx]?.trim() : null;
          record.group_2 = g2Idx !== undefined ? values[g2Idx]?.trim() : null;
          record.group_3 = g3Idx !== undefined ? values[g3Idx]?.trim() : null;
          break;
        }
        
        case 'sales': {
          const dayIdx = headerMapping.get('day');
          const storeIdx = headerMapping.get('store');
          const productIdx = headerMapping.get('product');
          const unitsIdx = headerMapping.get('units');
          
          if (dayIdx === undefined || storeIdx === undefined || productIdx === undefined || unitsIdx === undefined) {
            throw new Error(`Missing required columns: day, store, product, units must be present`);
          }
          
          record.day = normalizeDate(values[dayIdx]?.trim());
          record.store = values[storeIdx]?.trim();
          record.product = values[productIdx]?.trim();
          record.units = parseFloat(values[unitsIdx]) || 0;
          break;
        }
        
        case 'inventory': {
          const dayIdx = headerMapping.get('day');
          const storeIdx = headerMapping.get('store');
          const productIdx = headerMapping.get('product');
          const onHandIdx = headerMapping.get('units_on_hand');
          const onOrderIdx = headerMapping.get('units_on_order');
          const inTransitIdx = headerMapping.get('units_in_transit');
          
          if (dayIdx === undefined || storeIdx === undefined || productIdx === undefined) {
            throw new Error(`Missing required columns: day, store, product must be present`);
          }
          
          record.day = normalizeDate(values[dayIdx]?.trim());
          record.store = values[storeIdx]?.trim();
          record.product = values[productIdx]?.trim();
          record.units_on_hand = onHandIdx !== undefined ? (parseFloat(values[onHandIdx]) || 0) : 0;
          record.units_on_order = onOrderIdx !== undefined ? (parseInt(values[onOrderIdx]) || 0) : 0;
          record.units_in_transit = inTransitIdx !== undefined ? (parseInt(values[inTransitIdx]) || 0) : 0;
          break;
        }
      }
      
      records.push(record);
    }
    
    console.log(`Parsed ${records.length} records from CSV`);

    // Deduplicate records
    const dedupedRecords = deduplicateRecords(fileType, records);
    console.log(`After deduplication: ${dedupedRecords.length} records`);
    
    // Generate normalized CSV content
    const normalizedCSV = await generateNormalizedCSV(fileType, dedupedRecords);
    
    // Upload normalized version to storage
    const normalizedPath = filePath.replace(/\.(csv|CSV)$/, '_normalized.csv');
    const { error: normalizedUploadError } = await supabase.storage
      .from('dataset-files')
      .upload(normalizedPath, new Blob([normalizedCSV], { type: 'text/csv' }), {
        upsert: true
      });
    
    if (normalizedUploadError) {
      console.warn('Failed to upload normalized file:', normalizedUploadError);
    } else {
      console.log(`Uploaded normalized file to ${normalizedPath}`);
      // Update dataset with normalized filename
      const normalizedField = `${fileType}_filename`;
      await supabase
        .from('datasets')
        .update({ [normalizedField]: normalizedPath })
        .eq('id', datasetId);
    }

    // Determine RPC function and count field
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
    const batchSize = 500;
    for (let i = 0; i < dedupedRecords.length; i += batchSize) {
      const batch = dedupedRecords.slice(i, i + batchSize);
      
      const { error: rpcError } = await supabase.rpc(rpcFunction, {
        records: batch,
        p_dataset_id: datasetId,
      });
 
      if (rpcError) {
        throw new Error(`Failed to process batch: ${rpcError.message}`);
      }

      console.log(`Processed batch ${i / batchSize + 1} of ${Math.ceil(dedupedRecords.length / batchSize)}`);
    }

    // Update dataset with record count and date range
    const updates: any = {
      [countField]: dedupedRecords.length,
      status: 'active',
      processed_at: new Date().toISOString(),
    };
 
    // Calculate date range for sales/inventory
    if (fileType === 'sales' || fileType === 'inventory') {
      let minTime = Number.POSITIVE_INFINITY;
      let maxTime = Number.NEGATIVE_INFINITY;

      for (const r of dedupedRecords) {
        const dateStr = r.day || r.d;
        if (!dateStr) continue;

        const d = new Date(dateStr);
        const t = d.getTime();
        if (isNaN(t)) continue;

        if (t < minTime) minTime = t;
        if (t > maxTime) maxTime = t;
      }

      if (minTime !== Number.POSITIVE_INFINITY && maxTime !== Number.NEGATIVE_INFINITY) {
        updates.date_range_start = new Date(minTime).toISOString().split('T')[0];
        updates.date_range_end = new Date(maxTime).toISOString().split('T')[0];
      }
    }

    const { error: updateError } = await supabase
      .from('datasets')
      .update(updates)
      .eq('id', datasetId);

    if (updateError) {
      console.error('Failed to update dataset:', updateError);
      throw updateError;
    }

    console.log(`Successfully processed ${dedupedRecords.length} ${fileType} records for dataset ${datasetId}`);

  } catch (error: any) {
    console.error('Error in background processing:', error);
    
    // Mark dataset as error
    await supabase
      .from('datasets')
      .update({ 
        status: 'error',
        error_message: error.message || 'Processing failed'
      })
      .eq('id', datasetId);
  }
}

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

    // Set dataset status to 'processing'
    await supabase
      .from('datasets')
      .update({ status: 'processing' })
      .eq('id', datasetId);

    // Schedule background processing
    EdgeRuntime.waitUntil(
      processFileInBackground(supabase, { datasetId, fileType, filePath })
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Processing started. You can continue using the app.",
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error scheduling dataset processing:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
