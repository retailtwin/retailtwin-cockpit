import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotionPage {
  id: string;
  properties: {
    Title?: { title: { plain_text: string }[] };
    Category?: { select: { name: string } | null };
    Status?: { select: { name: string } | null };
    'Short Description'?: { rich_text: { plain_text: string }[] };
    Tags?: { multi_select: { name: string }[] };
    Priority?: { select: { name: string } | null };
  };
  url: string;
}

interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NOTION_API_KEY = Deno.env.get('NOTION_API_KEY');
    const NOTION_DATABASE_ID = Deno.env.get('NOTION_DATABASE_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
      throw new Error('Missing Notion configuration');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];
    let hasMore = true;
    let startCursor: string | undefined = undefined;

    console.log('Starting Notion sync...');

    // Fetch all published pages with pagination
    while (hasMore) {
      const notionResponse = await fetch(
        `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filter: {
              property: 'Status',
              select: {
                equals: 'Published',
              },
            },
            start_cursor: startCursor,
            page_size: 100,
          }),
        }
      );

      if (!notionResponse.ok) {
        const errorText = await notionResponse.text();
        throw new Error(`Notion API error: ${notionResponse.status} - ${errorText}`);
      }

      const data: NotionQueryResponse = await notionResponse.json();

      // Process each page
      for (const page of data.results) {
        try {
          // Extract properties
          const title = page.properties.Title?.title?.[0]?.plain_text || '';
          const category = page.properties.Category?.select?.name || 'General';
          const shortDescription = page.properties['Short Description']?.rich_text?.[0]?.plain_text || '';
          const tags = page.properties.Tags?.multi_select?.map(t => t.name) || [];

          if (!title) {
            console.log(`Skipping page ${page.id}: No title`);
            skipped++;
            continue;
          }

          // Upsert into archie_knowledge (no embedding needed - using full-text search)
          const { error: upsertError } = await supabase
            .from('archie_knowledge')
            .upsert({
              notion_page_id: page.id,
              notion_url: page.url,
              title,
              content_snippet: shortDescription,
              category,
              tags,
              source_type: 'notion',
              is_active: true,
              last_synced: new Date().toISOString(),
            }, {
              onConflict: 'notion_page_id',
            });

          if (upsertError) {
            console.error(`Failed to upsert ${title}:`, upsertError);
            errors.push(`Upsert failed for: ${title}`);
            skipped++;
          } else {
            console.log(`Synced: ${title}`);
            synced++;
          }
        } catch (pageError) {
          console.error(`Error processing page ${page.id}:`, pageError);
          errors.push(`Error processing page: ${pageError instanceof Error ? pageError.message : String(pageError)}`);
          skipped++;
        }
      }

      hasMore = data.has_more;
      startCursor = data.next_cursor || undefined;
    }

    const summary = {
      synced,
      skipped,
      errors,
      timestamp: new Date().toISOString(),
    };

    console.log('Sync complete:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        synced: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
