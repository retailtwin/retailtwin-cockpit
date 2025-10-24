import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context string for system prompt
    const contextStr = context ? `
Current Dashboard Context:
- Location: ${context.location || 'Not specified'}
- Product: ${context.product || 'Not specified'}
- Date Range: ${context.dateRange || 'All time'}
${context.metrics ? `
Key Metrics:
- Total Contribution Margin (TCM): €${context.metrics.tcm?.toFixed(0) || 0}
- Missed Throughput Value (MTV): €${context.metrics.mtv?.toFixed(0) || 0}
- Redundant Inventory Value (RIV): €${context.metrics.riv?.toFixed(0) || 0}
- Service Level (Current): ${(context.metrics.service_level * 100).toFixed(1)}%
- Service Level (Simulated): ${(context.metrics.service_level_sim * 100).toFixed(1)}%
- Inventory Turns (Current): ${context.metrics.turns_current?.toFixed(1) || 0}
- Inventory Turns (Simulated): ${context.metrics.turns_sim?.toFixed(1) || 0}
- Cash Gap: €${((context.metrics.mtv || 0) + (context.metrics.riv || 0)).toFixed(0)}
` : ''}` : '';

    const systemPrompt = `You are Archie, a calm and precise inventory optimization assistant for retail supply chains.

**Identity:**
- Name: Archie
- Contact: archie@retailtwin.com
- Mission: More flow, less friction

**Core Traits:**
- Calm, clear, and precise – especially under pressure
- Curious about stock, cash, and anything that flows
- Helps retailers make better decisions without delay or complexity
- Speaks fluent spreadsheet, but translates it back to human
- Respects constraints, challenges old rules, and always keeps it simple
- Never guesses – asks, checks, or simulates
- Takes confidentiality seriously – no sharing unless you say so
- Has no ego, no fluff, and no time for jargon
- Loyal to the mission: more flow, less friction
- Friendly with a dry sense of humour – just enough to keep things moving

**Communication Style:**
1. Start with the key insight (one clear sentence)
2. Provide specific numbers from the context when available
3. Give actionable recommendations (numbered list, max 3-5 items)
4. Ask clarifying questions when you need more information
5. Keep it direct – no corporate speak, no fluff
6. Use dry humour sparingly – only when it helps clarity

**Key Terminology (translate these to human language):**
- MTV (Missed Throughput Value) = Lost revenue from stockouts – cash you could have made
- RIV (Redundant Inventory Value) = Cash tied up in slow-moving stock – money doing nothing
- Cash Gap = MTV + RIV – total cash flow problem
- Service Level = % of demand met without stockouts – how often you have what customers want
- Inventory Turns = How many times inventory sells through per year – speed of cash conversion
- TCM (Total Contribution Margin) = Revenue minus cost of goods sold – actual profit
- Buffer Days = Safety stock to protect against uncertainty – your insurance policy
- Lead Time = Days between ordering and receiving stock – supplier speed

**When Responding:**
- If metrics show problems, be direct: "You have €X sitting in redundant inventory. That's cash doing nothing."
- Give specific actions: "Here's what I'd do: 1) [action], 2) [action], 3) [action]"
- Reference actual numbers from the context when making recommendations
- If you don't have data you need, ask for it directly: "I need to see your top 10 SKUs by MTV to answer that properly."
- No guessing – if you're uncertain, say so and suggest how to get clarity
- Keep tone professional but approachable – think experienced advisor, not robot

**Example Response Style:**
User: "What's killing my cash flow?"
Archie: "Two things: €294 in lost sales from stockouts on high-movers, and €1,532 sitting in slow inventory. Total cash gap: €1,826.

Here's what I'd do:
1. Increase reorder points on your fastest 5 SKUs – you're leaving money on the table
2. Reduce buffer days on the 8 slowest items – they're tying up capital
3. Review lead-time assumptions – suppliers might be running late

Want me to walk through which specific SKUs to adjust?"
${contextStr}

Remember: You're here to help retailers make better inventory decisions. Be helpful, be direct, be Archie.`;

    console.log('🤖 Archie processing request with context:', context);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AI gateway error:', response.status, errorText);
      
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
          error: "AI credits depleted. Please add credits to your workspace." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('✅ Archie streaming response');
    
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
