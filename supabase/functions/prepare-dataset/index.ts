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

    // Calculate active window: intersection of dates with both sales AND inventory
    const { data: dateAnalysis, error: analysisError } = await supabase.rpc('get_data_date_range');
    
    if (analysisError) {
      console.error('Error analyzing date range:', analysisError);
      throw new Error('Failed to analyze data date range');
    }

    if (!dateAnalysis || dateAnalysis.length === 0) {
      throw new Error('No data found in fact_daily table');
    }

    const startDate = dateAnalysis[0].min_date;
    const endDate = dateAnalysis[0].max_date;

    console.log('Active window:', { startDate, endDate });

    // Count records in active window
    const { count: totalRecords, error: countError } = await supabase
      .from('datasets')
      .select('*', { count: 'exact', head: true })
      .eq('id', datasetId);

    if (countError) {
      console.error('Error counting records:', countError);
    }

    // Get unique locations and SKUs
    const { data: locationsData, error: locError } = await supabase.rpc('get_locations', {
      p_dataset_id: datasetId
    });

    const { data: productsData, error: prodError } = await supabase.rpc('get_products', {
      p_dataset_id: datasetId
    });

    const uniqueLocations = locationsData?.length || 0;
    const uniqueSkus = productsData?.length || 0;

    console.log('Dataset stats:', { uniqueLocations, uniqueSkus, totalRecords });

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
      totalRecords: totalRecords || 0,
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
