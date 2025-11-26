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

    console.log('Preparing dataset for user:', user.id);

    // Get user's dataset
    const { data: datasets, error: datasetError } = await supabase
      .from('datasets')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (datasetError || !datasets || datasets.length === 0) {
      throw new Error('No dataset found for user');
    }

    const datasetId = datasets[0].id;
    console.log('Dataset ID:', datasetId);

    // Step 1: Check if public schema has data
    const { count: publicProductsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    const { count: publicFactDailyCount } = await supabase
      .from('fact_daily')
      .select('*', { count: 'exact', head: true });

    console.log('Public schema data:', { products: publicProductsCount, fact_daily: publicFactDailyCount });

    if (!publicProductsCount || publicProductsCount === 0) {
      throw new Error('No products found in staging area. Please import data first.');
    }

    if (!publicFactDailyCount || publicFactDailyCount === 0) {
      throw new Error('No sales/inventory data found in staging area. Please import data first.');
    }

    // Step 2: Copy locations from public to aifo with dataset_id
    const { data: publicLocations, error: locFetchError } = await supabase
      .from('locations')
      .select('*');

    if (locFetchError) {
      console.error('Error fetching locations:', locFetchError);
      throw new Error('Failed to fetch locations from staging');
    }

    const locationRecords = (publicLocations || []).map(loc => ({
      ...loc,
      dataset_id: datasetId
    }));

    if (locationRecords.length > 0) {
      const { error: locInsertError } = await supabase
        .rpc('upsert_locations_for_dataset', {
          p_dataset_id: datasetId,
          records: locationRecords
        });

      if (locInsertError) {
        console.error('Error inserting locations to aifo:', locInsertError);
        throw new Error(`Failed to copy locations: ${locInsertError.message}`);
      }
    }

    // Step 3: Copy products from public to aifo with dataset_id
    const { data: publicProducts, error: prodFetchError } = await supabase
      .from('products')
      .select('*');

    if (prodFetchError) {
      console.error('Error fetching products:', prodFetchError);
      throw new Error('Failed to fetch products from staging');
    }

    const productRecords = (publicProducts || []).map(prod => ({
      sku: prod.sku,
      name: prod.name,
      unit_cost: prod.cost_price,
      unit_price: prod.sales_price,
      pack_size: prod.pack_size,
      minimum_order_quantity: prod.minimum_order_quantity,
      group_1: prod.group_1,
      group_2: prod.group_2,
      group_3: prod.group_3,
      dataset_id: datasetId
    }));

    if (productRecords.length > 0) {
      const { error: prodInsertError } = await supabase
        .rpc('upsert_products_for_dataset', {
          p_dataset_id: datasetId,
          records: productRecords
        });

      if (prodInsertError) {
        console.error('Error inserting products to aifo:', prodInsertError);
        throw new Error(`Failed to copy products: ${prodInsertError.message}`);
      }
    }

    // Step 4: Copy fact_daily from public to aifo with dataset_id (batch processing)
    console.log('Copying fact_daily records in batches...');
    const batchSize = 1000;
    let offset = 0;
    let totalCopied = 0;

    while (true) {
      const { data: factBatch, error: factFetchError } = await supabase
        .from('fact_daily')
        .select('*')
        .range(offset, offset + batchSize - 1);

      if (factFetchError) {
        console.error('Error fetching fact_daily batch:', factFetchError);
        throw new Error('Failed to fetch fact_daily from staging');
      }

      if (!factBatch || factBatch.length === 0) break;

      // Separate into sales and inventory batches
      const salesBatch = factBatch
        .filter(f => f.units_sold > 0)
        .map(f => ({
          d: f.day,
          location_code: f.location_code,
          sku: f.sku,
          units_sold: f.units_sold,
          dataset_id: datasetId
        }));

      const inventoryBatch = factBatch
        .filter(f => f.units_on_hand > 0 || f.units_on_order > 0 || f.units_in_transit > 0)
        .map(f => ({
          d: f.day,
          location_code: f.location_code,
          sku: f.sku,
          on_hand_units: f.units_on_hand || 0,
          on_order_units: f.units_on_order || 0,
          in_transit_units: f.units_in_transit || 0,
          dataset_id: datasetId
        }));

      if (salesBatch.length > 0) {
        const { error: salesInsertError } = await supabase
          .rpc('insert_sales_for_dataset', {
            p_dataset_id: datasetId,
            records: salesBatch
          });

        if (salesInsertError) {
          console.error('Error inserting sales batch:', salesInsertError);
          throw new Error(`Failed to copy sales: ${salesInsertError.message}`);
        }
      }

      if (inventoryBatch.length > 0) {
        const { error: invInsertError } = await supabase
          .rpc('upsert_inventory_for_dataset', {
            p_dataset_id: datasetId,
            records: inventoryBatch
          });

        if (invInsertError) {
          console.error('Error inserting inventory batch:', invInsertError);
          throw new Error(`Failed to copy inventory: ${invInsertError.message}`);
        }
      }

      totalCopied += factBatch.length;
      console.log(`Copied ${totalCopied} fact_daily records...`);

      offset += batchSize;
    }

    // Step 5: Calculate date range from aifo schema
    const { data: dateAnalysis, error: analysisError } = await supabase.rpc('get_data_date_range');
    
    if (analysisError) {
      console.error('Error analyzing date range:', analysisError);
      throw new Error('Failed to analyze data date range');
    }

    if (!dateAnalysis || dateAnalysis.length === 0) {
      throw new Error('No data found after ETL process');
    }

    const startDate = dateAnalysis[0].min_date;
    const endDate = dateAnalysis[0].max_date;

    console.log('Active window:', { startDate, endDate });

    const uniqueLocations = locationRecords.length;
    const uniqueSkus = productRecords.length;

    console.log('Dataset stats:', { uniqueLocations, uniqueSkus, totalRecords: totalCopied });

    // Update dataset with metadata
    const { error: updateError } = await supabase
      .from('datasets')
      .update({
        date_range_start: startDate,
        date_range_end: endDate,
        total_locations: uniqueLocations,
        total_products: uniqueSkus,
        status: 'active',
        processed_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      })
      .eq('id', datasetId);

    if (updateError) {
      console.error('Error updating dataset:', updateError);
      throw new Error('Failed to update dataset metadata');
    }

    const metadata = {
      datasetId,
      startDate,
      endDate,
      uniqueLocations,
      uniqueSkus,
      totalRecords: totalCopied,
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dataset prepared successfully',
      metadata
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Prepare dataset error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to prepare dataset' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
