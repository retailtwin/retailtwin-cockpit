import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const importSchema = z.object({
  csvText: z.string()
    .min(1, 'CSV cannot be empty')
    .max(50_000_000, 'CSV exceeds 50MB limit')
    .refine(text => {
      const lines = text.trim().split('\n');
      return lines.length > 1;
    }, 'CSV must contain at least a header and one data row')
    .refine(text => {
      const firstLine = text.trim().split('\n')[0];
      return firstLine.includes('d') || firstLine.includes('date');
    }, 'CSV must have a valid header row')
});

// Error sanitization function
function sanitizeError(error: unknown, operation: string, supportId: string): object {
  console.error(`[${operation}] Internal error [${supportId}]:`, error);
  
  const genericErrors: Record<string, string> = {
    'import': 'Data import failed. Please check your CSV format.',
    'validation': 'Invalid CSV format. Please check your file.',
    'database': 'Database operation failed. Please contact support.',
    'parse': 'Failed to parse CSV data. Please check the format.'
  };
  
  return {
    error: genericErrors[operation] || 'An error occurred',
    code: operation.toUpperCase() + '_ERROR',
    support_id: supportId
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuthClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for admin role (required for data import)
    const { data: isAdmin, error: roleError } = await supabaseAuthClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse and validate request body
    const body = await req.json();
    const validationResult = importSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { csvText } = validationResult.data;

    // Parse CSV (skip header)
    const lines = csvText.trim().split('\n');
    const dataLines = lines.slice(1); // Skip header

    const batchSize = 1000;
    let totalInserted = 0;
    
    type FactDailyRecord = {
      d: string;
      location_code: string;
      sku: string;
      units_sold: string;
      on_hand_units: string;
      on_order_units: string;
      in_transit_units: string;
      on_hand_units_sim: string;
      target_units: string;
      economic_units: string;
      economic_overstock_units: string;
    } | null;
    
    for (let i = 0; i < dataLines.length; i += batchSize) {
      const batch = dataLines.slice(i, i + batchSize);
      const records = batch
        .map((line: string, lineIndex: number): FactDailyRecord => {
          try {
            const parts = line.split(',');
            
            // Skip if line is empty or doesn't have enough columns
            if (!line.trim() || parts.length < 23) {
              console.log(`Skipping line ${i + lineIndex}: insufficient columns or empty`);
              return null;
            }
            
            // Extract date from timestamp format "2023-01-01 00:00:00" -> "2023-01-01"
            const dateStr = parts[0].trim().split(' ')[0];
            
            // Skip if date is empty or invalid
            if (!dateStr || dateStr === '') {
              console.log(`Skipping line ${i + lineIndex}: empty date`);
              return null;
            }
            
            return {
              d: dateStr,
              location_code: parts[1].trim().replace('.0', ''),
              sku: parts[3].trim().replace('.0', ''),
              units_sold: parts[9].trim() || '0',
              on_hand_units: parts[12].trim() || '',
              on_order_units: parts[16].trim() || '0',
              in_transit_units: parts[18].trim() || '0',
              on_hand_units_sim: parts[14].trim() || '',
              target_units: parts[6].trim() || '',  // Green
              economic_units: parts[20].trim() || '',  // UnitsEco
              economic_overstock_units: parts[22].trim() || ''  // UnitsEcoOverstock
            };
          } catch (error) {
            console.error(`Error parsing line ${i + lineIndex}:`, error);
            return null;
          }
        })
        .filter((record: FactDailyRecord): record is Exclude<FactDailyRecord, null> => record !== null);

      // Skip batch if no valid records
      if (records.length === 0) {
        console.log(`Batch ${i}-${i + batchSize}: no valid records, skipping`);
        continue;
      }

      const { error } = await supabaseClient.rpc('insert_fact_daily_batch', {
        records
      });

      if (error) {
        const supportId = crypto.randomUUID();
        console.error(`[database] Batch insert error [${supportId}]:`, error);
        console.error(`[database] Batch info [${supportId}]:`, { batchStart: i, recordCount: records.length });
        return new Response(
          JSON.stringify({
            error: 'Failed to import CSV data. Please check the format.',
            code: 'DATABASE_ERROR',
            support_id: supportId
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      totalInserted += records.length;
      console.log(`Inserted ${totalInserted} records so far...`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${totalInserted} records` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const supportId = crypto.randomUUID();
    return new Response(
      JSON.stringify(sanitizeError(error, 'import', supportId)),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});