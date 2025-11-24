-- Phase 1: Consolidate datasets first, then add unique constraint

-- Step 1: Delete older datasets, keep most recent for each user
WITH ranked_datasets AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM datasets
)
DELETE FROM datasets
WHERE id IN (
  SELECT id FROM ranked_datasets WHERE rn > 1
);

-- Step 2: Now add unique constraint to enforce one dataset per user
ALTER TABLE datasets ADD CONSTRAINT datasets_user_id_unique UNIQUE (user_id);