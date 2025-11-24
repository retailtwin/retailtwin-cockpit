-- Drop RLS policies that depend on is_template and is_active
DROP POLICY IF EXISTS "Users view own datasets and templates" ON datasets;
DROP POLICY IF EXISTS "Users delete own datasets" ON datasets;

-- Recreate simplified RLS policies
CREATE POLICY "Users view own datasets"
ON datasets FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users delete own datasets"
ON datasets FOR DELETE
USING (user_id = auth.uid());

-- Now drop the columns
ALTER TABLE datasets DROP COLUMN IF EXISTS is_active;
ALTER TABLE datasets DROP COLUMN IF EXISTS is_template;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS last_updated timestamp with time zone DEFAULT now();