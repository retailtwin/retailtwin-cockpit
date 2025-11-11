-- Update search_knowledge function to return Notion fields
DROP FUNCTION IF EXISTS public.search_knowledge(vector, double precision, integer);

CREATE OR REPLACE FUNCTION public.search_knowledge(
  query_embedding vector, 
  match_threshold double precision DEFAULT 0.7, 
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid, 
  title text, 
  content text, 
  category text, 
  tags text[], 
  similarity double precision,
  notion_page_id text,
  notion_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ak.id,
    ak.title,
    ak.content_snippet as content,
    ak.category,
    ak.tags,
    (1 - (ak.embedding <=> query_embedding))::float as similarity,
    ak.notion_page_id,
    ak.notion_url
  FROM archie_knowledge ak
  WHERE ak.is_active = true
    AND (1 - (ak.embedding <=> query_embedding)) > match_threshold
  ORDER BY ak.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;