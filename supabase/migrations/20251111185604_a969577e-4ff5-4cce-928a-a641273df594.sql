-- Add Notion integration fields to archie_knowledge table
ALTER TABLE archie_knowledge 
  ADD COLUMN IF NOT EXISTS notion_page_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS notion_url TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS last_synced TIMESTAMP WITH TIME ZONE;

-- Rename content to content_snippet for clarity
ALTER TABLE archie_knowledge 
  RENAME COLUMN content TO content_snippet;

-- Create index on notion_page_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_archie_knowledge_notion_page_id 
  ON archie_knowledge(notion_page_id);

-- Create index on source_type for filtering
CREATE INDEX IF NOT EXISTS idx_archie_knowledge_source_type 
  ON archie_knowledge(source_type);

COMMENT ON COLUMN archie_knowledge.content_snippet IS 'Short description or snippet - full content fetched from Notion on demand';
COMMENT ON COLUMN archie_knowledge.notion_page_id IS 'Notion page ID for synced articles';
COMMENT ON COLUMN archie_knowledge.source_type IS 'Source of the knowledge article: manual, notion, etc.';