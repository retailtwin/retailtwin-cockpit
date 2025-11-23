-- Drop old batch functions without dataset_id parameter
DROP FUNCTION IF EXISTS public.upsert_products_batch(jsonb);
DROP FUNCTION IF EXISTS public.upsert_locations_batch(jsonb);
DROP FUNCTION IF EXISTS public.upsert_inventory_batch(jsonb);
DROP FUNCTION IF EXISTS public.insert_fact_daily_batch(jsonb);

-- Drop duplicate _for_dataset functions with wrong parameter order (records, dataset_id)
DROP FUNCTION IF EXISTS public.upsert_products_for_dataset(jsonb, uuid);
DROP FUNCTION IF EXISTS public.upsert_locations_for_dataset(jsonb, uuid);
DROP FUNCTION IF EXISTS public.upsert_inventory_for_dataset(jsonb, uuid);
DROP FUNCTION IF EXISTS public.insert_sales_for_dataset(jsonb, uuid);

-- The correct versions with parameter order (p_dataset_id uuid, records jsonb) are already in place
-- These will remain and be the only versions available