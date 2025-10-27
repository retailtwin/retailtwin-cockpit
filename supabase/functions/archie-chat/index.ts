import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    
    // Initialize Supabase client for function calling
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const systemPrompt = `You are Archie, a calm and precise inventory optimization assistant for retail supply chains.

Core Traits:
- Direct and action-oriented - no fluff or jargon
- Data-driven - always reference specific numbers from the context provided or your analytical tools
- Calm under pressure - clear explanations even for complex issues
- Never guess - if you need more data, use your analytical tools or ask
- Dry humour - subtle, never distracting
- Translate spreadsheet speak to human language
- Keep responses concise and actionable

When answering:
1. Start with the key insight (one sentence)
2. Provide specific numbers from the context or your tools
3. Give actionable recommendations (numbered list, max 3-4 items)
4. Ask clarifying questions when needed

You have access to analytical tools:
1. get_pareto_analysis - for sales distribution and SKU ranking analysis
2. get_sku_details - for deep-dive on specific SKUs
3. get_top_skus_by_metric - for identifying top/bottom performers by various metrics

Use these tools proactively when users ask analytical questions. Always cite specific numbers from the data.

Key Terminology (use these terms naturally):
- MTV (Missed Throughput Value) = Lost revenue from stockouts. This is opportunity cost.
- RIV (Redundant Inventory Value) = Cash tied up in slow-moving stock. This is working capital waste.
- Cash Gap = MTV + RIV = Total opportunity to improve cash flow
- Service Level = % of demand met without stockouts (target: 95%+)
- Turns = How many times inventory sells through per year (higher is better)
- TCM (Total Contribution Margin) = Gross profit from sales

Current Context Available:
${context ? `
Location: ${context.location || 'Not specified'}
Product/SKU: ${context.product || 'Not specified'}
Date Range: ${context.dateRange || 'Not specified'}

Key Metrics:
- Total Contribution Margin (TCM): €${context.metrics?.tcm?.toFixed(2) || 'N/A'}
- Missed Throughput Value (MTV): €${context.metrics?.mtv?.toFixed(2) || 'N/A'}
- Redundant Inventory Value (RIV): €${context.metrics?.riv?.toFixed(2) || 'N/A'}
- Service Level: ${context.metrics?.service_level ? (context.metrics.service_level * 100).toFixed(1) + '%' : 'N/A'}
- Simulated Service Level: ${context.metrics?.service_level_sim ? (context.metrics.service_level_sim * 100).toFixed(1) + '%' : 'N/A'}
- Current Inventory Turns: ${context.metrics?.turns_current?.toFixed(2) || 'N/A'}
- Simulated Turns: ${context.metrics?.turns_sim?.toFixed(2) || 'N/A'}
` : 'No specific context provided'}

Your goal: Help retailers improve cash flow and service levels through better inventory decisions.

Remember: Be direct, use specific numbers, use your analytical tools when needed, keep it actionable.`;

    // Define tools for function calling
    const tools = [
      {
        type: "function",
        function: {
          name: "get_pareto_analysis",
          description: "Get Pareto curve data showing SKU contribution to sales. Use when user asks about top performers, sales distribution, SKU ranking, or wants to see which items drive the most revenue.",
          parameters: {
            type: "object",
            properties: {
              location_code: { 
                type: "string",
                description: "Location code (e.g., '98274' or 'ALL' for all locations)"
              },
              sku: { 
                type: "string",
                description: "SKU code or 'ALL' for all SKUs"
              },
              date: { 
                type: "string",
                description: "End date for analysis in YYYY-MM-DD format"
              }
            },
            required: ["location_code", "date"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_sku_details",
          description: "Get detailed analytics for a specific SKU including sales trends, stockout history, and inventory levels. Use when user wants deep-dive information on a particular item.",
          parameters: {
            type: "object",
            properties: {
              location_code: { type: "string" },
              sku: { type: "string" },
              start_date: { type: "string" },
              end_date: { type: "string" }
            },
            required: ["location_code", "sku", "start_date", "end_date"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_top_skus_by_metric",
          description: "Get top N SKUs ranked by a specific metric. Use when user asks 'show me top 5', 'which SKUs need attention', or wants to identify problem areas.",
          parameters: {
            type: "object",
            properties: {
              location_code: { type: "string" },
              metric: { 
                type: "string",
                enum: ["sales", "stockout_days", "turns"],
                description: "Metric to rank by: 'sales' for top sellers, 'stockout_days' for items with most stockouts, 'turns' for inventory turnover"
              },
              limit: { 
                type: "number",
                default: 10,
                description: "Number of SKUs to return (default 10)"
              },
              start_date: { type: "string" },
              end_date: { type: "string" }
            },
            required: ["location_code", "metric"]
          }
        }
      }
    ];

    console.info(`🤖 Archie processing request with context:`, JSON.stringify(context, null, 2));

    // Initial API call with function calling enabled
    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        tools: tools,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AI gateway error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limits exceeded. Please try again in a moment." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI usage limit reached. Please contact support to add more credits." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI processing error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstResponse = await response.json();
    const firstChoice = firstResponse.choices?.[0];

    // Check if AI wants to call a function
    if (firstChoice?.message?.tool_calls && firstChoice.message.tool_calls.length > 0) {
      console.info(`🔧 Archie calling tools:`, firstChoice.message.tool_calls.map((tc: any) => tc.function.name));
      
      // Execute all tool calls
      const toolResults = await Promise.all(
        firstChoice.message.tool_calls.map(async (toolCall: any) => {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          console.info(`📊 Executing ${functionName} with args:`, functionArgs);
          
          try {
            const { data, error } = await supabase.rpc(functionName, {
              p_location_code: functionArgs.location_code,
              p_sku: functionArgs.sku,
              p_metric: functionArgs.metric,
              p_limit: functionArgs.limit,
              p_date: functionArgs.date,
              p_start_date: functionArgs.start_date,
              p_end_date: functionArgs.end_date,
            });
            
            if (error) {
              console.error(`❌ Error calling ${functionName}:`, error);
              return {
                tool_call_id: toolCall.id,
                role: "tool",
                content: JSON.stringify({ error: error.message })
              };
            }
            
            console.info(`✅ ${functionName} returned ${Array.isArray(data) ? data.length : 1} results`);
            
            return {
              tool_call_id: toolCall.id,
              role: "tool",
              content: JSON.stringify(data)
            };
          } catch (err) {
            console.error(`❌ Exception in ${functionName}:`, err);
            return {
              tool_call_id: toolCall.id,
              role: "tool",
              content: JSON.stringify({ error: String(err) })
            };
          }
        })
      );

      // Make second API call with tool results, now with streaming
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            firstChoice.message,
            ...toolResults
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ AI gateway error on second call: ${response.status}`, errorText);
        return new Response(JSON.stringify({ error: "AI processing error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.info('✅ Archie streaming response');
    
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
    
  } catch (e) {
    console.error("❌ Archie chat error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
