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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { fileType } = await req.json();

    if (!fileType) {
      throw new Error('Missing fileType parameter');
    }

    console.log(`Downloading ${fileType} data from public schema`);

    let csvContent = '';
    let filename = '';

    // Export from public schema using the new export functions
    switch (fileType) {
      case 'locations': {
        const { data, error } = await supabase
          .rpc('export_public_locations_data');

        if (error) throw error;

        const headers = ['store_code', 'name', 'production_lead_time', 'shipping_lead_time', 'order_days'];
        const rows = (data || []).map((loc: any) => ({
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
          .rpc('export_public_products_data');

        if (error) throw error;

        const headers = ['product_code', 'name', 'cost_price', 'sales_price', 'pack_size', 'minimum_order_quantity', 'group_1', 'group_2', 'group_3'];
        const rows = (data || []).map((prod: any) => ({
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
          .rpc('export_public_sales_data');

        if (error) throw error;

        const headers = ['day', 'store', 'product', 'units'];
        const rows = (data || []).map((row: any) => ({
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
          .rpc('export_public_inventory_data');

        if (error) throw error;

        const headers = ['day', 'store', 'product', 'units_on_hand', 'units_on_order', 'units_in_transit'];
        const rows = (data || []).map((row: any) => ({
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

    console.log(`Generated ${fileType} CSV with ${csvContent.split('\n').length} lines`);

    // Return the CSV content directly for download
    return new Response(
      csvContent,
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        } 
      }
    );

  } catch (error: any) {
    console.error('Download error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Download failed' }),
      { 
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});