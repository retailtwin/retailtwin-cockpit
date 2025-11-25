import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingSummary {
  locations: number;
  products: number;
  sales: number;
  inventory: number;
  warnings: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[ETL-Enhanced] Starting enhanced ETL process...');

  try {
    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseAuthClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ETL-Enhanced] Processing for user: ${user.id}`);

    const formData = await req.formData();
    const datasetId = formData.get('datasetId') as string;
    const locationsPath = formData.get('locationsPath') as string;
    const productsPath = formData.get('productsPath') as string;
    const salesPath = formData.get('salesPath') as string;
    const inventoryPath = formData.get('inventoryPath') as string;

    console.log('[ETL-Enhanced] File paths:', { locationsPath, productsPath, salesPath, inventoryPath });

    const summary: ProcessingSummary = {
      locations: 0,
      products: 0,
      sales: 0,
      inventory: 0,
      warnings: []
    };

    // Process Locations
    if (locationsPath) {
      console.log('[ETL-Enhanced] Processing locations...');
      const { data: locFile, error: locError } = await supabaseClient.storage
        .from('dataset-files')
        .download(locationsPath);

      if (locError) {
        console.error('[ETL-Enhanced] Error downloading locations:', locError);
        summary.warnings.push(`Failed to download locations: ${locError.message}`);
      } else {
        const text = await locFile.text();
        const lines = text.trim().split('\n');
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        
        console.log('[ETL-Enhanced] Locations headers:', headers);

        const storeCodeIdx = headers.findIndex(h => h.includes('store') || h.includes('code'));
        const nameIdx = headers.findIndex(h => h.includes('name'));
        const prodLeadIdx = headers.findIndex(h => h.includes('production'));
        const shipLeadIdx = headers.findIndex(h => h.includes('shipping'));
        const orderDaysIdx = headers.findIndex(h => h.includes('order'));

        const locationRecords = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
          if (parts.length < 2) continue;

          const record: any = {
            code: parts[storeCodeIdx] || `STORE${i}`,
            name: parts[nameIdx] || `Store ${i}`,
            production_lead_time: prodLeadIdx >= 0 ? parseInt(parts[prodLeadIdx]) || 0 : 0,
            shipping_lead_time: shipLeadIdx >= 0 ? parseInt(parts[shipLeadIdx]) || 5 : 5,
            order_days: orderDaysIdx >= 0 ? parts[orderDaysIdx] : 'mon,tue,wed,thu,fri',
            dataset_id: datasetId
          };

          locationRecords.push(record);
        }

        console.log(`[ETL-Enhanced] Parsed ${locationRecords.length} location records`);

        if (locationRecords.length > 0) {
          const { error: insertError } = await supabaseClient
            .rpc('upsert_locations_for_dataset', {
              p_dataset_id: datasetId,
              records: locationRecords
            });

          if (insertError) {
            console.error('[ETL-Enhanced] Error inserting locations:', insertError);
            summary.warnings.push(`Failed to insert locations: ${insertError.message}`);
          } else {
            summary.locations = locationRecords.length;
            console.log(`[ETL-Enhanced] Inserted ${locationRecords.length} locations`);
          }
        }
      }
    }

    // Process Products
    if (productsPath) {
      console.log('[ETL-Enhanced] Processing products...');
      const { data: prodFile, error: prodError } = await supabaseClient.storage
        .from('dataset-files')
        .download(productsPath);

      if (prodError) {
        console.error('[ETL-Enhanced] Error downloading products:', prodError);
        summary.warnings.push(`Failed to download products: ${prodError.message}`);
      } else {
        const text = await prodFile.text();
        const lines = text.trim().split('\n');
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        
        console.log('[ETL-Enhanced] Products headers:', headers);

        const skuIdx = headers.findIndex(h => h.includes('product') || h.includes('sku'));
        const nameIdx = headers.findIndex(h => h.includes('name'));
        const costIdx = headers.findIndex(h => h.includes('cost'));
        const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('sales'));
        const packIdx = headers.findIndex(h => h.includes('pack'));
        const moqIdx = headers.findIndex(h => h.includes('minimum') || h.includes('moq'));
        const g1Idx = headers.findIndex(h => h.includes('group_1') || h.includes('category'));
        const g2Idx = headers.findIndex(h => h.includes('group_2') || h.includes('subcategory'));
        const g3Idx = headers.findIndex(h => h.includes('group_3') || h.includes('season'));

        const productRecords = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
          if (parts.length < 2) continue;

          const record: any = {
            sku: parts[skuIdx] || `SKU${i}`,
            name: parts[nameIdx] || `Product ${i}`,
            unit_cost: costIdx >= 0 ? parseFloat(parts[costIdx]) || 0 : 0,
            unit_price: priceIdx >= 0 ? parseFloat(parts[priceIdx]) || 0 : 0,
            pack_size: packIdx >= 0 ? parseInt(parts[packIdx]) || 1 : 1,
            minimum_order_quantity: moqIdx >= 0 ? parseInt(parts[moqIdx]) || 1 : 1,
            group_1: g1Idx >= 0 ? parts[g1Idx] : '',
            group_2: g2Idx >= 0 ? parts[g2Idx] : '',
            group_3: g3Idx >= 0 ? parts[g3Idx] : '',
            dataset_id: datasetId
          };

          productRecords.push(record);
        }

        console.log(`[ETL-Enhanced] Parsed ${productRecords.length} product records`);

        if (productRecords.length > 0) {
          const { error: insertError } = await supabaseClient
            .rpc('upsert_products_for_dataset', {
              p_dataset_id: datasetId,
              records: productRecords
            });

          if (insertError) {
            console.error('[ETL-Enhanced] Error inserting products:', insertError);
            summary.warnings.push(`Failed to insert products: ${insertError.message}`);
          } else {
            summary.products = productRecords.length;
            console.log(`[ETL-Enhanced] Inserted ${productRecords.length} products`);
          }
        }
      }
    }

    // Process Sales
    if (salesPath) {
      console.log('[ETL-Enhanced] Processing sales...');
      const { data: salesFile, error: salesError } = await supabaseClient.storage
        .from('dataset-files')
        .download(salesPath);

      if (salesError) {
        console.error('[ETL-Enhanced] Error downloading sales:', salesError);
        summary.warnings.push(`Failed to download sales: ${salesError.message}`);
      } else {
        const text = await salesFile.text();
        const lines = text.trim().split('\n');
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        
        console.log('[ETL-Enhanced] Sales headers:', headers);

        const dateIdx = headers.findIndex(h => h.includes('day') || h.includes('date'));
        const storeIdx = headers.findIndex(h => h.includes('store') || h.includes('location'));
        const skuIdx = headers.findIndex(h => h.includes('product') || h.includes('sku'));
        const unitsIdx = headers.findIndex(h => h.includes('units') || h.includes('quantity'));

        const salesRecords = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, '').replace(/^=/, ''));
          if (parts.length < 4) continue;

          const dateStr = parts[dateIdx].split(' ')[0]; // Extract date from timestamp
          
          const record: any = {
            d: dateStr,
            location_code: parts[storeIdx],
            sku: parts[skuIdx],
            units_sold: parseFloat(parts[unitsIdx]) || 0,
            dataset_id: datasetId
          };

          salesRecords.push(record);
        }

        console.log(`[ETL-Enhanced] Parsed ${salesRecords.length} sales records`);

        if (salesRecords.length > 0) {
          const batchSize = 1000;
          let inserted = 0;

          for (let i = 0; i < salesRecords.length; i += batchSize) {
            const batch = salesRecords.slice(i, i + batchSize);
            
            const { error: insertError } = await supabaseClient
              .rpc('insert_sales_for_dataset', {
                p_dataset_id: datasetId,
                records: batch
              });

            if (insertError) {
              console.error('[ETL-Enhanced] Error inserting sales batch:', insertError);
              summary.warnings.push(`Failed to insert sales batch at ${i}: ${insertError.message}`);
            } else {
              inserted += batch.length;
              console.log(`[ETL-Enhanced] Inserted ${inserted}/${salesRecords.length} sales records`);
            }
          }

          summary.sales = inserted;
        }
      }
    }

    // Process Inventory
    if (inventoryPath) {
      console.log('[ETL-Enhanced] Processing inventory...');
      const { data: invFile, error: invError } = await supabaseClient.storage
        .from('dataset-files')
        .download(inventoryPath);

      if (invError) {
        console.error('[ETL-Enhanced] Error downloading inventory:', invError);
        summary.warnings.push(`Failed to download inventory: ${invError.message}`);
      } else {
        const text = await invFile.text();
        const lines = text.trim().split('\n');
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        
        console.log('[ETL-Enhanced] Inventory headers:', headers);

        const dateIdx = headers.findIndex(h => h.includes('day') || h.includes('date'));
        const storeIdx = headers.findIndex(h => h.includes('store') || h.includes('location'));
        const skuIdx = headers.findIndex(h => h.includes('product') || h.includes('sku'));
        const onHandIdx = headers.findIndex(h => h.includes('on_hand') || h.includes('on hand'));
        const onOrderIdx = headers.findIndex(h => h.includes('on_order') || h.includes('on order'));
        const inTransitIdx = headers.findIndex(h => h.includes('transit') || h.includes('in_transit'));

        const inventoryRecords = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, '').replace(/^=/, ''));
          if (parts.length < 3) continue;

          const dateStr = parts[dateIdx].split(' ')[0];
          
          const record: any = {
            d: dateStr,
            location_code: parts[storeIdx],
            sku: parts[skuIdx],
            on_hand_units: onHandIdx >= 0 ? parseFloat(parts[onHandIdx]) || 0 : 0,
            on_order_units: onOrderIdx >= 0 ? parseFloat(parts[onOrderIdx]) || 0 : 0,
            in_transit_units: inTransitIdx >= 0 ? parseFloat(parts[inTransitIdx]) || 0 : 0,
            dataset_id: datasetId
          };

          inventoryRecords.push(record);
        }

        console.log(`[ETL-Enhanced] Parsed ${inventoryRecords.length} inventory records`);

        if (inventoryRecords.length > 0) {
          const batchSize = 1000;
          let inserted = 0;

          for (let i = 0; i < inventoryRecords.length; i += batchSize) {
            const batch = inventoryRecords.slice(i, i + batchSize);
            
            const { error: insertError } = await supabaseClient
              .rpc('upsert_inventory_for_dataset', {
                p_dataset_id: datasetId,
                records: batch
              });

            if (insertError) {
              console.error('[ETL-Enhanced] Error inserting inventory batch:', insertError);
              summary.warnings.push(`Failed to insert inventory batch at ${i}: ${insertError.message}`);
            } else {
              inserted += batch.length;
              console.log(`[ETL-Enhanced] Inserted ${inserted}/${inventoryRecords.length} inventory records`);
            }
          }

          summary.inventory = inserted;
        }
      }
    }

    // Update dataset status
    const { error: updateError } = await supabaseClient
      .from('datasets')
      .update({
        status: summary.warnings.length > 0 ? 'active' : 'active',
        total_locations: summary.locations,
        total_products: summary.products,
        total_sales_records: summary.sales,
        total_inventory_records: summary.inventory,
        processed_at: new Date().toISOString(),
        error_message: summary.warnings.length > 0 ? summary.warnings.join('; ') : null
      })
      .eq('id', datasetId);

    if (updateError) {
      console.error('[ETL-Enhanced] Error updating dataset:', updateError);
    }

    console.log('[ETL-Enhanced] Processing complete:', summary);

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ETL-Enhanced] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
