import { supabase } from "@/integrations/supabase/client";

export interface Location {
  code: string;
  name: string | null;
}

export interface Product {
  sku: string;
  name: string | null;
}

export interface KPIData {
  location_code: string;
  sku: string;
  days_total: number;
  sku_loc_days: number;
  tcm: number | null;
  turns_current: number | null;
  turns_sim: number | null;
  mtv: number | null;
  service_level: number;
  service_level_sim: number;
  missed_units: number | null;
  riv: number | null;
}

export interface FactDaily {
  d: string;
  location_code: string;
  sku: string;
  units_sold: number;
  on_hand_units: number | null;
  on_hand_units_sim: number | null;
}

export async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase.rpc('get_locations' as any);
  
  if (error) {
    console.error("Error fetching locations:", error);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    return [];
  }
  return (data as any) || [];
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.rpc('get_products' as any);
  
  if (error) {
    console.error("Error fetching products:", error);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    return [];
  }
  return (data as any) || [];
}

export async function fetchKPIData(
  locationCode: string,
  sku: string,
  startDate?: string,
  endDate?: string
): Promise<KPIData | null> {
  // Use aggregated function if either parameter is 'ALL'
  const rpcName = (locationCode === 'ALL' || sku === 'ALL') 
    ? 'get_kpi_data_aggregated' 
    : 'get_kpi_data';
    
  const { data, error } = await supabase.rpc(rpcName as any, {
    p_location_code: locationCode,
    p_sku: sku,
    p_start_date: startDate || null,
    p_end_date: endDate || null
  });
  
  if (error) {
    console.error("Error fetching KPI data:", error);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    console.error("RPC name used:", rpcName);
    console.error("Parameters:", { p_location_code: locationCode, p_sku: sku });
    return null;
  }
  const result = data as any;
  return result && Array.isArray(result) && result.length > 0 ? result[0] : null;
}

export async function fetchFactDaily(
  locationCode: string,
  sku: string,
  startDate?: string,
  endDate?: string
): Promise<FactDaily[]> {
  // Use aggregated function if either parameter is 'ALL'
  const rpcName = (locationCode === 'ALL' || sku === 'ALL') 
    ? 'get_fact_daily_aggregated' 
    : 'get_fact_daily';
    
  const { data, error } = await supabase.rpc(rpcName as any, {
    p_location_code: locationCode,
    p_sku: sku,
    p_start_date: startDate || null,
    p_end_date: endDate || null
  });
  
  if (error) {
    console.error("Error fetching fact daily:", error);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    console.error("RPC name used:", rpcName);
    console.error("Parameters:", { p_location_code: locationCode, p_sku: sku });
    return [];
  }
  return (data as any) || [];
}

export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `€${(value / 1000).toFixed(0)}K`;
}

export function formatNumber(value: number | null, decimals: number = 0): string | number {
  if (value === null || value === undefined) return "—";
  return decimals > 0 ? value.toFixed(decimals) : Math.round(value);
}

export function formatPercentage(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(1)}%`;
}
