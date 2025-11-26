import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { location_code, sku, start_date, end_date } = body;

    console.log(`DBM Calculation starting for location: ${location_code}, SKU: ${sku}`);

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Fetch data
    const { data: rawData, error: fetchError } = await supabase.rpc("get_fact_daily_raw", {
      p_location_code: location_code,
      p_sku: sku,
      p_start_date: start_date,
      p_end_date: end_date,
    });

    if (fetchError) throw fetchError;

    console.log(`Fetched ${rawData?.length || 0} records`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          processed: rawData?.length || 0,
          message: "Test successful",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
