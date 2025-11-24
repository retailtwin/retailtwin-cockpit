import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CommonScope {
  dateRange: { min: string; max: string } | null;
  locations: Array<{ code: string; name: string }>;
  products: Array<{ sku: string; name: string; group_1: string; group_2: string; group_3: string }>;
  totalProducts: number;
  productGroups: Map<string, number>;
  isLoading: boolean;
}

export function useCommonScope() {
  const [commonScope, setCommonScope] = useState<CommonScope>({
    dateRange: null,
    locations: [],
    products: [],
    totalProducts: 0,
    productGroups: new Map(),
    isLoading: true,
  });

  useEffect(() => {
    loadCommonScope();
  }, []);

  const loadCommonScope = async () => {
    try {
      // Fetch date range
      const { data: dateData } = await supabase.rpc('get_data_date_range');
      const dateRange = dateData && dateData.length > 0 
        ? { min: dateData[0].min_date, max: dateData[0].max_date }
        : null;

      // Fetch locations
      const { data: locationsData } = await supabase.rpc('get_locations');
      const locations = (locationsData || []) as Array<{ code: string; name: string }>;

      // Fetch products with grouping info using direct SQL query
      const { data: productsData, error: productsError } = await supabase
        .rpc('export_products_data' as any);

      if (productsError) {
        console.error('Error fetching products:', productsError);
      }

      const products = (productsData || []).map((p: any) => ({
        sku: p.sku,
        name: p.name,
        group_1: p.group_1 || 'Uncategorized',
        group_2: p.group_2 || 'Other',
        group_3: p.group_3 || '',
      })) as Array<{ 
        sku: string; 
        name: string; 
        group_1: string; 
        group_2: string; 
        group_3: string 
      }>;

      // Build product group map
      const productGroups = new Map<string, number>();
      products.forEach(p => {
        const g1 = p.group_1 || 'Uncategorized';
        productGroups.set(g1, (productGroups.get(g1) || 0) + 1);
      });

      setCommonScope({
        dateRange,
        locations,
        products,
        totalProducts: products.length,
        productGroups,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading common scope:', error);
      setCommonScope(prev => ({ ...prev, isLoading: false }));
    }
  };

  return commonScope;
}
