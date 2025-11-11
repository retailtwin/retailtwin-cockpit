import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';
import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts';

interface KnowledgeResult {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  similarity: number;
  notion_page_id?: string;
  notion_url?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(50000, 'Message too long')
  })).min(1, 'At least one message required').max(100, 'Too many messages'),
  context: z.object({
    location: z.string().optional(),
    product: z.string().optional(),
    dateRange: z.string().optional(),
    metrics: z.object({
      tcm: z.number().optional(),
      mtv: z.number().optional(),
      riv: z.number().optional(),
      service_level: z.number().optional(),
      service_level_sim: z.number().optional(),
      turns_current: z.number().optional(),
      turns_sim: z.number().optional()
    }).passthrough().optional(),
    paretoSummary: z.object({
      totalSkus: z.number().optional(),
      top20Count: z.number().optional(),
      top20Contribution: z.number().optional(),
      topSkus: z.array(z.object({
        sku: z.string().optional(),
        name: z.string().optional(),
        sales: z.number().optional(),
        cumulativePercent: z.number().optional(),
        availability: z.number().optional()
      })).optional()
    }).passthrough().optional()
  }).passthrough().optional()
});

// Error sanitization function
function sanitizeError(error: unknown, operation: string, supportId: string): object {
  console.error(`[${operation}] Internal error [${supportId}]:`, error);
  
  const genericErrors: Record<string, string> = {
    'chat': 'Chat processing failed. Please try again.',
    'validation': 'Invalid message format. Please check your input.',
    'ai': 'AI processing error. Please try again in a moment.',
    'database': 'Database operation failed. Please contact support.'
  };
  
  return {
    error: genericErrors[operation] || 'An error occurred',
    code: operation.toUpperCase() + '_ERROR',
    support_id: supportId
  };
}

// Helper to infer date range from database
async function inferDateRange(supabaseClient: any): Promise<{start_date: string, end_date: string}> {
  console.log('🗓️ Inferring date range from database...');
  
  const { data, error } = await supabaseClient.rpc('get_data_date_range');
  
  if (error || !data || data.length === 0) {
    console.error('⚠️ Could not infer date range, using defaults:', error);
    return {
      start_date: '2023-01-01',
      end_date: '2023-12-31'
    };
  }
  
  console.log('✅ Inferred date range:', data[0]);
  return {
    start_date: data[0].min_date,
    end_date: data[0].max_date
  };
}

// Search knowledge base using full-text search (no embeddings needed)
async function searchKnowledgeBase(
  supabaseAdmin: any,
  question: string,
  threshold = 0.1,
  limit = 3
): Promise<KnowledgeResult[]> {
  try {
    console.log('🔍 Searching knowledge base for:', question.substring(0, 100));
    
    const { data, error } = await supabaseAdmin.rpc('search_knowledge', {
      query_text: question,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) {
      console.error('⚠️ Knowledge search error:', error);
      return [];
    }

    console.log(`✅ Found ${data?.length || 0} relevant knowledge articles`);
    return data || [];
  } catch (error) {
    console.error('⚠️ Error searching knowledge base:', error);
    return [];
  }
}

// Track unanswered questions for knowledge base curation
async function trackUnansweredQuestion(
  supabaseAdmin: any,
  question: string,
  context: any
): Promise<void> {
  try {
    console.log('📝 Tracking unanswered question:', question.substring(0, 100));
    await supabaseAdmin.rpc('track_unanswered_question', {
      p_question: question,
      p_context: context
    });
    console.log('✅ Unanswered question tracked');
  } catch (error) {
    console.error('⚠️ Error tracking unanswered question:', error);
  }
}

// Track knowledge base usage
async function trackKnowledgeUsage(
  supabaseAdmin: any,
  knowledgeId: string,
  question: string,
  similarity: number
): Promise<void> {
  try {
    await supabaseAdmin.rpc('track_knowledge_usage', {
      p_knowledge_id: knowledgeId,
      p_question: question,
      p_similarity_score: similarity
    });
  } catch (error) {
    console.error('⚠️ Error tracking knowledge usage:', error);
  }
}

// Fetch full content from Notion API
async function fetchNotionContent(pageId: string): Promise<string> {
  const NOTION_API_KEY = Deno.env.get('NOTION_API_KEY');
  if (!NOTION_API_KEY) {
    console.error('⚠️ NOTION_API_KEY not configured');
    return '';
  }

  try {
    // Fetch page blocks
    const response = await fetch(
      `https://api.notion.com/v1/blocks/${pageId}/children`,
      {
        headers: {
          'Authorization': `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': '2022-06-28',
        },
      }
    );

    if (!response.ok) {
      console.error(`⚠️ Notion API error: ${response.status}`);
      return '';
    }

    const data = await response.json();
    
    // Extract text from blocks
    const textContent: string[] = [];
    for (const block of data.results) {
      if (block.type === 'paragraph' && block.paragraph?.rich_text) {
        const text = block.paragraph.rich_text.map((t: any) => t.plain_text).join('');
        if (text) textContent.push(text);
      } else if (block.type === 'heading_1' && block.heading_1?.rich_text) {
        const text = block.heading_1.rich_text.map((t: any) => t.plain_text).join('');
        if (text) textContent.push(`\n## ${text}\n`);
      } else if (block.type === 'heading_2' && block.heading_2?.rich_text) {
        const text = block.heading_2.rich_text.map((t: any) => t.plain_text).join('');
        if (text) textContent.push(`\n### ${text}\n`);
      } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item?.rich_text) {
        const text = block.bulleted_list_item.rich_text.map((t: any) => t.plain_text).join('');
        if (text) textContent.push(`• ${text}`);
      } else if (block.type === 'numbered_list_item' && block.numbered_list_item?.rich_text) {
        const text = block.numbered_list_item.rich_text.map((t: any) => t.plain_text).join('');
        if (text) textContent.push(`${text}`);
      }
    }

    return textContent.join('\n');
  } catch (error) {
    console.error('⚠️ Error fetching Notion content:', error);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Parse and validate request body
    const body = await req.json();
    const validationResult = chatSchema.safeParse(body);
    
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
    
    const { messages, context } = validationResult.data;
    console.log('📨 Received request:', { messageCount: messages?.length, hasContext: !!context });
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY not found');
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    
    // Initialize Supabase client for function calling
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Infer date range from database
    const inferredDates = await inferDateRange(supabase);
    console.log('📅 Using date range:', inferredDates);

    const systemPrompt = `You are Archie, a calm and precise inventory optimization assistant for retail supply chains.

Core Traits:
- Direct and action-oriented - no fluff or jargon
- Data-driven - always reference specific numbers from the context provided or your analytical tools
- Calm under pressure - clear explanations even for complex issues
- Never guess - if you need more data, use your analytical tools or ask
- Dry humour - subtle, never distracting
- Translate spreadsheet speak to human language
- Keep responses concise and actionable
- Question lead-times and compliance to processes/rules, not forecasts
- Focus on operational execution issues: are lead-times realistic? Are teams following the replenishment rules?

**CRITICAL - Data Usage & Integrity Rules:**
- ONLY use data from actual tool call responses or the Current Context section
- NEVER invent, guess, or make up ANY identifiers (style codes, SKUs, location codes, etc.)
- If a tool returns NULL or empty results, say "I don't have data for [X]" - never make up numbers
- If data quality flags indicate low confidence or data gaps, explicitly warn the user
- When data freshness is >7 days old, alert the user that it may not reflect current state
- If you call a tool and get results, cite ONLY the actual values from those results
- Example: If get_mtv_by_sku_style returns styles ["10272", "20345", "30456"], you can ONLY mention those exact styles
- When analyzing data, reference the exact field names and values from the JSON response

**Data Freshness & Date Handling:**
- The current data spans from ${inferredDates.start_date} to ${inferredDates.end_date}
- When using tools without explicit dates, this full range is automatically used
- Always reference this date range when discussing trends or patterns
- If tool calls return no results, mention the data timeframe to user

When answering:
1. Start with the key insight (one sentence)
2. Provide specific numbers from the context or your tools
3. Give actionable recommendations (numbered list, max 3-4 items)
4. Ask clarifying questions when essential information is missing:
   - Which location? (if user manages multiple)
   - Which unit of measure? (units, cost, retail)
   - Which time period or inventory stage?

**IMPORTANT - Context Usage:**
- You have access to the current context (Location, Product, Date Range, Metrics)
- When calling analytical tools, USE THE CONTEXT DATA automatically
- DO NOT ask users for information that's already in the context
- Be proactive: if a question can be answered by calling a tool with context data, call it immediately
- For Pareto requests: IMMEDIATELY call get_pareto_analysis with context location and end date - then analyze results explaining business concentration

**AUGMENTING EXISTING DASHBOARD:**
- The Dashboard shows 21-day rolling KPIs for selected location/product
- Your role is to answer deeper analytical questions the Dashboard doesn't cover:
  * Cross-location comparisons
  * Pipeline analysis (on-order, in-transit inventory)
  * Metric-specific rankings
  * Custom date ranges beyond Dashboard filters
- Always acknowledge if user should check the Dashboard for specific info

You have access to analytical tools:
1. get_pareto_analysis - Pareto curve showing which SKUs drive most sales (80/20 rule). Use for "Pareto distribution", "top performers", "sales concentration"
2. get_sku_details - detailed metrics for specific SKUs
3. get_top_skus_by_metric - top/bottom performers by metrics
4. get_mtv_by_sku_style - MTV by SKU style prefix
5. calculate_inventory_pipeline - inventory in supply chain (on-order, in-transit)
6. get_inventory_snapshot - current inventory position with freshness check
7. analyze_inventory_by_metric - problem area analysis (slow-moving, overstocked)

Use these tools proactively when users ask analytical questions. Always cite specific numbers from the data.
PRIORITY: When data is already provided in "Current Context Available" section, reference that data directly first. Only call tools for additional analysis or different filters.

**CRITICAL - Pareto Analysis:**
When user asks about "Pareto distribution", "Pareto analysis", or "show me Pareto":
1. IMMEDIATELY call get_pareto_analysis with context location and date range end date
2. Analyze results focusing on: concentration (what % of sales come from top 20% of items), dependency on key SKUs, risk if top items stockout
3. NEVER ask what metric - Pareto is ALWAYS about sales/revenue distribution

**KNOWLEDGE BASE:**
You have access to a curated knowledge base of inventory management best practices, DBM methodology, and company-specific processes.
- After checking analytical tools, search the knowledge base for relevant information
- If you find relevant knowledge (similarity > 0.75), use it to enhance your response
- If you cannot answer with confidence, acknowledge the gap and note the question for review
- The knowledge base is your second source after analytical data

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

${context.paretoSummary ? `
Pareto Distribution Analysis (ALREADY FETCHED - Reference this data directly):
- Total SKUs analyzed: ${context.paretoSummary.totalSkus}
- Top 20% threshold: ${context.paretoSummary.top20Count} SKUs
- Top 20% sales contribution: ${context.paretoSummary.top20Contribution?.toFixed(1)}% of total sales
${context.paretoSummary.topSkus && context.paretoSummary.topSkus.length > 0 ? `
- Top performing SKUs (sorted by sales):
${context.paretoSummary.topSkus.map((sku: any, i: number) => 
  `  ${i+1}. ${sku.name} (${sku.sku}): ${sku.sales?.toFixed(0) || 'N/A'} units sold, ${sku.cumulativePercent?.toFixed(1) || 'N/A'}% cumulative, ${sku.availability?.toFixed(1) || 'N/A'}% availability`
).join('\n')}

IMPORTANT: When Pareto data is shown above, reference it directly in your analysis.
Only use the get_pareto_analysis tool if you need different filters or more recent data.
User phrases like "show me", "analyze", or "what insights" refer to interpreting the existing data above.
` : ''}
` : ''}
` : 'No specific context provided'}

Your goal: Help retailers improve cash flow and service levels through better inventory decisions.

Remember: Be direct, use specific numbers, use your analytical tools when needed, keep it actionable.`;

    // Define tools for function calling
    const tools = [
      {
        type: "function",
        function: {
          name: "get_pareto_analysis",
          description: "Get Pareto curve data showing SKU contribution to sales. Shows which items drive most revenue (80/20 rule). ALWAYS use this tool when user asks about: 'Pareto distribution', 'Pareto analysis', 'top performers', 'sales distribution', 'SKU ranking', '80/20', or 'which items drive revenue'. Automatically analyze the results to explain business concentration and dependency on key items.",
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
                enum: ["sales", "stockout_days", "turns", "mtv"],
                description: "Metric to rank by: 'sales' for top sellers, 'stockout_days' for items with most stockouts, 'turns' for inventory turnover, 'mtv' for missed revenue opportunities"
              },
              limit: { 
                type: "number",
                default: 10,
                description: "Number of SKUs to return (default 10)"
              },
              start_date: { 
                type: "string",
                description: "Start date (optional - defaults to earliest data)" 
              },
              end_date: { 
                type: "string",
                description: "End date (optional - defaults to latest data)" 
              }
            },
            required: ["location_code", "metric"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_mtv_by_sku_style",
          description: "Get MTV (Missed Throughput Value) aggregated by SKU 'style' - the first N digits of SKU codes. Use when user asks about MTV by style, wants to group SKUs by prefix, or mentions 'first 5 digits'. Style groups related products together.",
          parameters: {
            type: "object",
            properties: {
              location_code: { 
                type: "string",
                description: "Location code (e.g., '98274' or 'ALL' for all locations)"
              },
              style_length: { 
                type: "number",
                default: 5,
                description: "Number of leading digits to use for style grouping (default: 5)"
              },
              start_date: { 
                type: "string",
                description: "Start date in YYYY-MM-DD format"
              },
              end_date: { 
                type: "string",
                description: "End date in YYYY-MM-DD format"
              }
            },
            required: ["location_code"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "calculate_inventory_pipeline",
          description: "Calculate inventory in supply chain (on-order, in-transit). Returns data with validation flags. Use when user asks about 'inventory on the way', 'pipeline', or 'what's coming'. NEVER use for on-hand inventory (that's in Dashboard).",
          parameters: {
            type: "object",
            properties: {
              location_code: {
                type: "string",
                description: "Location code or 'ALL'"
              },
              unit_of_measure: {
                type: "string",
                enum: ["units", "cost", "retail"],
                default: "units",
                description: "Units, cost, or retail value. If user says 'dollars'/'money', use 'retail'"
              },
              pipeline_stage: {
                type: "string",
                enum: ["on_order", "in_transit", "both"],
                default: "both"
              },
              start_date: {
                type: "string",
                description: "Optional start date YYYY-MM-DD"
              },
              end_date: {
                type: "string",
                description: "Optional end date YYYY-MM-DD"
              }
            },
            required: ["location_code"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_inventory_snapshot",
          description: "Get current inventory position (on-hand, on-order, in-transit totals) with data freshness validation. Use for 'current stock levels', 'how much inventory'. Check data_freshness_days and warn if stale.",
          parameters: {
            type: "object",
            properties: {
              location_code: {
                type: "string",
                description: "Location code or 'ALL'"
              }
            },
            required: ["location_code"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "analyze_inventory_by_metric",
          description: "Analyze inventory using metrics (slow-moving, overstocked). Returns confidence_level and data_gaps. MUST warn user if confidence is 'low'. Use for analytical questions about problem areas.",
          parameters: {
            type: "object",
            properties: {
              location_code: {
                type: "string",
                description: "Location code or 'ALL'"
              },
              metric_type: {
                type: "string",
                enum: ["slow_moving", "overstocked"],
                description: "Type of analysis"
              },
              grouping: {
                type: "string",
                enum: ["category", "location", "status"],
                default: "category"
              }
            },
            required: ["location_code", "metric_type"]
          }
        }
      }
    ];

    console.info(`🤖 Archie processing request with context:`, JSON.stringify(context, null, 2));

    // Search knowledge base for relevant context
    const userQuestion = messages[messages.length - 1]?.content || '';
    let knowledgeContext = '';
    const knowledgeResults = await searchKnowledgeBase(supabase, userQuestion);
    
    if (knowledgeResults.length > 0) {
      console.log(`📚 Found ${knowledgeResults.length} relevant knowledge articles`);
      
      // Fetch full content from Notion for relevant articles
      const enrichedResults = await Promise.all(
        knowledgeResults.map(async (k) => {
          if (k.notion_page_id && k.similarity > 0.75) {
            console.log(`🔍 Fetching full Notion content for: ${k.title}`);
            const fullContent = await fetchNotionContent(k.notion_page_id);
            return {
              ...k,
              fullContent: fullContent || k.content,
            };
          }
          return { ...k, fullContent: k.content };
        })
      );
      
      knowledgeContext = '\n\n**KNOWLEDGE BASE CONTEXT:**\n' + 
        enrichedResults.map((k, i) => {
          const source = k.notion_url ? `\n📚 *Source: [${k.title}](${k.notion_url})*` : '';
          return `${i + 1}. ${k.title} (${k.category}, relevance: ${(k.similarity * 100).toFixed(0)}%)\n${k.fullContent}${source}`;
        }).join('\n\n');
      
      // Track usage of top result if highly relevant
      if (knowledgeResults[0].similarity > 0.75) {
        await trackKnowledgeUsage(
          supabase,
          knowledgeResults[0].id,
          userQuestion,
          knowledgeResults[0].similarity
        );
      }
    }

    // Enhance system prompt with knowledge base context
    const enhancedSystemPrompt = systemPrompt + knowledgeContext;

    // Initial API call with function calling enabled
    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 4096,
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          ...messages
        ],
        tools: tools,
      }),
    });

    if (!response.ok) {
      const supportId = crypto.randomUUID();
      console.error(`❌ AI gateway error [${supportId}]: ${response.status}`);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limits exceeded. Please try again in a moment.",
          code: "RATE_LIMIT_ERROR"
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI usage limit reached. Please contact support to add more credits.",
          code: "QUOTA_EXCEEDED"
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify(sanitizeError(new Error('AI gateway error'), 'ai', supportId)),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firstResponse = await response.json();
    console.log('✅ Received AI response');
    
    const toolCalls = firstResponse.choices?.[0]?.message?.tool_calls || [];

    // Check if AI wants to call a function
    if (toolCalls.length > 0) {
      console.info(`🔧 Archie calling tools:`, toolCalls.map((tc: any) => tc.function.name));
      
      // Execute all tool calls
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall: any) => {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          // Auto-inject dates if not provided and function supports them
          if (!functionArgs.start_date && functionName !== 'get_pareto_analysis' && functionName !== 'get_inventory_snapshot') {
            functionArgs.start_date = inferredDates.start_date;
          }
          if (!functionArgs.end_date && functionName !== 'get_pareto_analysis' && functionName !== 'get_inventory_snapshot') {
            functionArgs.end_date = inferredDates.end_date;
          }
          
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
              p_style_length: functionArgs.style_length,
              p_unit_of_measure: functionArgs.unit_of_measure,
              p_pipeline_stage: functionArgs.pipeline_stage,
              p_metric_type: functionArgs.metric_type,
              p_grouping: functionArgs.grouping,
            });
            
            if (error) {
              const supportId = crypto.randomUUID();
              console.error(`❌ Error calling ${functionName} [${supportId}]:`, error);
              return {
                role: "tool",
                tool_call_id: toolCall.id,
                name: functionName,
                content: JSON.stringify({ 
                  error: 'Database query failed',
                  support_id: supportId
                })
              };
            }
            
            console.info(`✅ ${functionName} returned ${Array.isArray(data) ? data.length : 1} results`);
            console.info(`📋 ${functionName} data preview:`, JSON.stringify(data).substring(0, 500));
            
            return {
              role: "tool",
              tool_call_id: toolCall.id,
              name: functionName,
              content: JSON.stringify(data)
            };
          } catch (err) {
            const supportId = crypto.randomUUID();
            console.error(`❌ Exception in ${functionName} [${supportId}]:`, err);
            return {
              role: "tool",
              tool_call_id: toolCall.id,
              name: functionName,
              content: JSON.stringify({ 
                error: 'Tool execution failed',
                support_id: supportId
              })
            };
          }
        })
      );

      // Make second API call with tool results, now with streaming
      console.log('🚀 Making second AI call with tool results...');
      const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          max_tokens: 4096,
          messages: [
            { role: "system", content: enhancedSystemPrompt },
            ...messages,
            firstResponse.choices[0].message,
            ...toolResults
          ],
          stream: true,
        }),
      });

      if (!streamResponse.ok) {
        const supportId = crypto.randomUUID();
        console.error(`❌ AI gateway error on second call [${supportId}]: ${streamResponse.status}`);
        
        if (streamResponse.status === 429) {
          return new Response(JSON.stringify({ 
            error: "Rate limits exceeded. Please try again in a moment.",
            code: "RATE_LIMIT_ERROR"
          }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        if (streamResponse.status === 402) {
          return new Response(JSON.stringify({ 
            error: "AI usage limit reached. Please contact support to add more credits.",
            code: "QUOTA_EXCEEDED"
          }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        return new Response(
          JSON.stringify(sanitizeError(new Error('AI gateway error'), 'ai', supportId)),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.info('✅ Archie streaming response with tool results');
      
      return new Response(streamResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls - stream direct response
    console.info('✅ Archie response without tools, streaming...');
    
    // Check if we should track as unanswered
    // If no knowledge was found with high confidence, consider tracking
    if (knowledgeResults.length === 0 || knowledgeResults[0].similarity < 0.7) {
      console.log('📝 Low confidence response - tracking as potentially unanswered');
      await trackUnansweredQuestion(supabase, userQuestion, context);
    }
    
    const directStreamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 4096,
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });
    
    if (!directStreamResponse.ok) {
      const supportId = crypto.randomUUID();
      console.error(`❌ AI gateway error [${supportId}]: ${directStreamResponse.status}`);
      
      if (directStreamResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limits exceeded. Please try again in a moment.",
          code: "RATE_LIMIT_ERROR"
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (directStreamResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI usage limit reached. Please contact support to add more credits.",
          code: "QUOTA_EXCEEDED"
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(
        JSON.stringify(sanitizeError(new Error('AI gateway error'), 'ai', supportId)),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(directStreamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
    
  } catch (e) {
    const supportId = crypto.randomUUID();
    return new Response(
      JSON.stringify(sanitizeError(e, 'chat', supportId)),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
