-- Remove conflicting permissive policies that bypass security
DROP POLICY IF EXISTS "Allow public read access to fact_daily" ON aifo.fact_daily;
DROP POLICY IF EXISTS "Allow public read access to locations" ON aifo.locations;
DROP POLICY IF EXISTS "Allow public read access to products" ON aifo.products;
DROP POLICY IF EXISTS "Authenticated users can view products" ON aifo.products;

-- Add proper location-based access for products
-- Users can view products if they have at least one location assigned
CREATE POLICY "Users can view products for their locations"
ON aifo.products
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_locations
    WHERE user_locations.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);