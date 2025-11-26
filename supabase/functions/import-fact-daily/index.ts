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

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      day: string;
      location_code: string;
      sku: string;
      units_sold: number;
      units_on_hand: number;
      units_on_order: number;
      units_in_transit: number;
    } | null;
    
    for (let i = 0; i < dataLines.length; i += batchSize) {
      const batch = dataLines.slice(i, i + batchSize);
      const records = batch
        .map((line: string, lineIndex: number): FactDailyRecord => {
          try {
            const parts = line.split(',').map(p => p.trim());
            
            // Skip if line is empty or doesn't have enough columns
            if (!line.trim() || parts.length < 4) {
              console.log(`Skipping line ${i + lineIndex + 2}: insufficient columns or empty`);
              return null;
            }
            
            // CSV format: day,store,product,units
            const day = parts[0];
            const store = parts[1];
            const product = parts[2];
            const units = parts[3];
            
            // Skip if required fields are empty
            if (!day || !store || !product) {
              console.log(`Skipping line ${i + lineIndex + 2}: missing required fields`);
              return null;
            }
            
            return {
              day,
              location_code: store,
              sku: product,
              units_sold: parseFloat(units) || 0,
              units_on_hand: 0,
              units_on_order: 0,
              units_in_transit: 0
            };
          } catch (error) {
            console.error(`Error parsing line ${i + lineIndex + 2}:`, error);
            return null;
          }
        })
        .filter((record: FactDailyRecord): record is Exclude<FactDailyRecord, null> => record !== null);

      // Skip batch if no valid records
      if (records.length === 0) {
        console.log(`Batch ${i}-${i + batchSize}: no valid records, skipping`);
        continue;
      }

      const { error } = await supabase
        .from('fact_daily')
        .upsert(records, {
          onConflict: 'day,location_code,sku',
          ignoreDuplicates: false
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
  } catch (error: any) {
    console.error('Import fact_daily error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Import failed' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});