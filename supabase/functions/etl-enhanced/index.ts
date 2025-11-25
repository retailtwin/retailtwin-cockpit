import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('ETL Enhanced: Starting processing...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse multipart form data
    const formData = await req.formData();
    console.log('Received form data');

    // Get files from form data
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`Found file: ${value.name}, size: ${value.size}`);
        files.push(value);
      }
    }

    if (files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No files uploaded' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse options
    const optionsStr = formData.get('options') as string;
    const options = optionsStr ? JSON.parse(optionsStr) : {};
    console.log('Options:', options);

    // Process each file
    let totalRecords = 0;
    const summary: any = {
      stores: 0,
      products: 0,
      sales: 0,
      inventory: 0,
      warnings: []
    };

    for (const file of files) {
      const text = await file.text();
      console.log(`Processing ${file.name}: ${text.length} bytes`);
      
      // Detect file type from name or content
      const fileName = file.name.toLowerCase();
      let entityType = '';
      
      if (fileName.includes('store') || fileName.includes('location')) {
        entityType = 'stores';
      } else if (fileName.includes('product') || fileName.includes('sku')) {
        entityType = 'products';
      } else if (fileName.includes('sales')) {
        entityType = 'sales';
      } else if (fileName.includes('inventory') || fileName.includes('stock')) {
        entityType = 'inventory';
      }

      console.log(`Detected entity type: ${entityType}`);
      summary[entityType] = summary[entityType] || 0;
      
      // For now, just count lines (we'll add real parsing next)
      const lines = text.trim().split('\n');
      const recordCount = lines.length - 1; // minus header
      summary[entityType] += recordCount;
      totalRecords += recordCount;
    }

    console.log('Processing complete. Summary:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        message: `Successfully processed ${files.length} files with ${totalRecords} total records`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('ETL Enhanced Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});