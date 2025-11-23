-- Drop existing functions that don't filter by dataset
DROP FUNCTION IF EXISTS public.get_locations();
DROP FUNCTION IF EXISTS public.get_products();

-- Create new functions that filter by dataset_id
CREATE OR REPLACE FUNCTION public.get_locations(p_dataset_id uuid)
RETURNS TABLE(code text, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
  SELECT DISTINCT
    l.code,
    l.name
  FROM aifo.locations l
  WHERE l.dataset_id = p_dataset_id
  ORDER BY l.code;
$$;

CREATE OR REPLACE FUNCTION public.get_products(p_dataset_id uuid)
RETURNS TABLE(sku text, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'aifo'
AS $$
  SELECT DISTINCT
    p.sku,
    p.name
  FROM aifo.products p
  WHERE p.dataset_id = p_dataset_id
  ORDER BY p.sku;
$$;