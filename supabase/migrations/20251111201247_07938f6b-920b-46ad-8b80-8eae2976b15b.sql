-- Drop the embedding column since we're switching to full-text search
ALTER TABLE public.archie_knowledge DROP COLUMN IF EXISTS embedding;

-- Add search_vector column for full-text search
ALTER TABLE public.archie_knowledge ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create index on search_vector for performance
CREATE INDEX IF NOT EXISTS archie_knowledge_search_vector_idx ON public.archie_knowledge USING GIN (search_vector);

-- Create function to update search_vector
CREATE OR REPLACE FUNCTION public.update_archie_knowledge_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_snippet, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search_vector
DROP TRIGGER IF EXISTS update_archie_knowledge_search_vector_trigger ON public.archie_knowledge;
CREATE TRIGGER update_archie_knowledge_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.archie_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.update_archie_knowledge_search_vector();

-- Update existing rows to populate search_vector
UPDATE public.archie_knowledge
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content_snippet, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'D');

-- Replace the search_knowledge function to use full-text search
CREATE OR REPLACE FUNCTION public.search_knowledge(query_text text, match_threshold numeric DEFAULT 0.1, match_count integer DEFAULT 5)
RETURNS TABLE(
  id uuid,
  title text,
  content_snippet text,
  category text,
  tags text[],
  notion_url text,
  similarity numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.title,
    k.content_snippet,
    k.category,
    k.tags,
    k.notion_url,
    ts_rank(k.search_vector, websearch_to_tsquery('english', query_text))::numeric as similarity
  FROM archie_knowledge k
  WHERE k.is_active = true
    AND k.search_vector @@ websearch_to_tsquery('english', query_text)
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;