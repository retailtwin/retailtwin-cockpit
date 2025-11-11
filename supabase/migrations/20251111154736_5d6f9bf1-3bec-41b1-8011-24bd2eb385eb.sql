-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base table with vector embeddings
CREATE TABLE archie_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text, -- e.g., 'DBM methodology', 'inventory management', 'KPI explanations'
  tags text[],
  embedding vector(1536), -- Embedding dimension for text-embedding models
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  is_active boolean DEFAULT true
);

-- Unanswered questions tracking
CREATE TABLE unanswered_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  context jsonb, -- Store the context at the time of asking
  frequency integer DEFAULT 1,
  first_asked timestamptz DEFAULT now(),
  last_asked timestamptz DEFAULT now(),
  status text DEFAULT 'new', -- 'new', 'reviewing', 'answered', 'dismissed'
  resolved_by uuid,
  knowledge_article_id uuid REFERENCES archie_knowledge(id),
  notes text
);

-- Knowledge usage tracking
CREATE TABLE knowledge_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id uuid REFERENCES archie_knowledge(id) ON DELETE CASCADE,
  question text NOT NULL,
  similarity_score numeric,
  was_helpful boolean,
  used_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_archie_knowledge_embedding ON archie_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_archie_knowledge_category ON archie_knowledge(category);
CREATE INDEX idx_archie_knowledge_active ON archie_knowledge(is_active) WHERE is_active = true;
CREATE INDEX idx_unanswered_questions_status ON unanswered_questions(status);
CREATE INDEX idx_knowledge_usage_knowledge_id ON knowledge_usage(knowledge_id);

-- RLS policies
ALTER TABLE archie_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE unanswered_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_usage ENABLE ROW LEVEL SECURITY;

-- Active knowledge is readable by authenticated users
CREATE POLICY "Active knowledge is readable"
  ON archie_knowledge FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage knowledge
CREATE POLICY "Admins can manage knowledge"
  ON archie_knowledge FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert unanswered questions
CREATE POLICY "Can insert unanswered questions"
  ON unanswered_questions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can manage unanswered questions
CREATE POLICY "Admins can manage unanswered questions"
  ON unanswered_questions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can track knowledge usage
CREATE POLICY "Can track knowledge usage"
  ON knowledge_usage FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can view usage
CREATE POLICY "Admins can view usage"
  ON knowledge_usage FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to search knowledge base with semantic search
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  tags text[],
  similarity float
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ak.id,
    ak.title,
    ak.content,
    ak.category,
    ak.tags,
    (1 - (ak.embedding <=> query_embedding))::float as similarity
  FROM archie_knowledge ak
  WHERE ak.is_active = true
    AND (1 - (ak.embedding <=> query_embedding)) > match_threshold
  ORDER BY ak.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to track or update unanswered question
CREATE OR REPLACE FUNCTION track_unanswered_question(
  p_question text,
  p_context jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_id uuid;
BEGIN
  -- Check if similar question already exists
  SELECT id INTO v_question_id
  FROM unanswered_questions
  WHERE LOWER(TRIM(question)) = LOWER(TRIM(p_question))
    AND status != 'dismissed'
  LIMIT 1;
  
  IF v_question_id IS NOT NULL THEN
    -- Update existing question
    UPDATE unanswered_questions
    SET frequency = frequency + 1,
        last_asked = now(),
        context = COALESCE(p_context, context)
    WHERE id = v_question_id;
  ELSE
    -- Insert new question
    INSERT INTO unanswered_questions (question, context)
    VALUES (p_question, p_context)
    RETURNING id INTO v_question_id;
  END IF;
  
  RETURN v_question_id;
END;
$$;

-- Function to track knowledge usage
CREATE OR REPLACE FUNCTION track_knowledge_usage(
  p_knowledge_id uuid,
  p_question text,
  p_similarity_score numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage_id uuid;
BEGIN
  INSERT INTO knowledge_usage (knowledge_id, question, similarity_score)
  VALUES (p_knowledge_id, p_question, p_similarity_score)
  RETURNING id INTO v_usage_id;
  
  RETURN v_usage_id;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_archie_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_archie_knowledge_updated_at
  BEFORE UPDATE ON archie_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION update_archie_knowledge_updated_at();