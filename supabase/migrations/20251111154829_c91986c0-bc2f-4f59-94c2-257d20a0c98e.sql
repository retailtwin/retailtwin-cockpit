-- Fix search_path for trigger function (only)
DROP TRIGGER IF EXISTS update_archie_knowledge_updated_at ON archie_knowledge;
DROP FUNCTION IF EXISTS update_archie_knowledge_updated_at();

CREATE OR REPLACE FUNCTION update_archie_knowledge_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_archie_knowledge_updated_at
  BEFORE UPDATE ON archie_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION update_archie_knowledge_updated_at();