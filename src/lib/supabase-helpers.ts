import { supabase } from "@/integrations/supabase/client";

export interface Location {
  code: string;
  name: string | null;
  order_days?: string | null;
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
  riv_sim: number | null;
}

export interface FactDaily {
  d: string;
  location_code: string;
  sku: string;
  units_sold: number;
  on_hand_units: number | null;
  on_hand_units_sim: number | null;
  target_units?: number | null;
  economic_units?: number | null;
  economic_overstock_units?: number | null;
}

export interface DBMCalculation {
  location_code: string;
  sku: string;
  calculation_date: string;
  target_units: number | null;
  economic_units: number | null;
  economic_overstock_units: number | null;
  on_hand_units: number | null;
  created_at?: string;
}

export async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase.rpc("get_locations");

  if (error) {
    console.error("Error fetching locations:", error);
    return [];
  }
  return (data as any) || [];
}

export async function fetchLocationOrderDays(locationCode: string): Promise<string | null> {
  // Use raw query to get order_days from aifo.locations
  const { data, error } = await supabase
    .rpc('get_system_setting', {
      p_setting_key: 'order_days',
      p_location_code: locationCode === 'ALL' ? null : locationCode
    } as any);
  
  if (error) {
    console.error("Error fetching order days:", error);
    // Fallback: default to all days
    return "mon,tue,wed,thu,fri,sat,sun";
  }
  
  // If we have a result, it's a jsonb, so we need to extract the string value
  if (data && typeof data === 'string') {
    // Remove quotes if present
    return data.replace(/"/g, '');
  }
  
  return "mon,tue,wed,thu,fri,sat,sun";
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.rpc("get_products");

  if (error) {
    console.error("Error fetching products:", error);
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
  let finalStartDate = startDate;
  let finalEndDate = endDate;
  
  // If dates not provided, use actual data range
  if (!startDate || !endDate) {
    const dateRange = await getDataDateRange();
    if (dateRange) {
      finalStartDate = finalStartDate || dateRange.min_date;
      finalEndDate = finalEndDate || dateRange.max_date;
    }
  }

  // Use aggregated function if either parameter is 'ALL'
  const rpcName =
    locationCode === "ALL" || sku === "ALL"
      ? "get_kpi_data_aggregated"
      : "get_kpi_data";

  const params: any = {
    p_location_code: locationCode,
    p_sku: sku,
    p_start_date: finalStartDate || null,
    p_end_date: finalEndDate || null,
  };

  const { data, error } = await supabase.rpc(rpcName as any, params);

  if (error) {
    console.error("Error fetching KPI data:", error);
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
  let finalStartDate = startDate;
  let finalEndDate = endDate;
  
  // If dates not provided, use actual data range
  if (!startDate || !endDate) {
    const dateRange = await getDataDateRange();
    if (dateRange) {
      finalStartDate = finalStartDate || dateRange.min_date;
      finalEndDate = finalEndDate || dateRange.max_date;
    }
  }

  // Use aggregated function if either parameter is 'ALL'
  const rpcName =
    locationCode === "ALL" || sku === "ALL"
      ? "get_fact_daily_aggregated"
      : "get_fact_daily_raw";

  const params: any = {
    p_location_code: locationCode,
    p_sku: sku,
    p_start_date: finalStartDate || null,
    p_end_date: finalEndDate || null,
  };

  const { data, error } = await supabase.rpc(rpcName as any, params);

  if (error) {
    console.error("Error fetching fact daily:", error);
    return [];
  }
  return (data as any) || [];
}

export async function fetchDBMCalculations(
  locationCode?: string,
  sku?: string,
  startDate?: string,
  endDate?: string
): Promise<DBMCalculation[]> {
  let query = supabase
    .from("dbm_calculations")
    .select("*")
    .order("calculation_date", { ascending: false });

  if (locationCode && locationCode !== "ALL") {
    query = query.eq("location_code", locationCode);
  }

  if (sku && sku !== "ALL") {
    query = query.eq("sku", sku);
  }

  if (startDate) {
    query = query.gte("calculation_date", startDate);
  }

  if (endDate) {
    query = query.lte("calculation_date", endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching DBM calculations:", error);
    return [];
  }

  return (data as DBMCalculation[]) || [];
}

/**
 * Currency formatter:
 * - amounts under €10,000 show full euros (no "K")
 * - amounts ≥ €10,000 show thousands with a K suffix
 */
export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "—";
  const v = Number(value);
  if (Number.isNaN(v)) return "—";
  if (Math.abs(v) < 10000) return `€${v.toFixed(0)}`;
  return `€${(v / 1000).toFixed(0)}K`;
}

export function formatNumber(
  value: number | null,
  decimals: number = 0
): string | number {
  if (value === null || value === undefined) return "—";
  return decimals > 0 ? Number(value).toFixed(decimals) : Math.round(Number(value));
}

export function formatPercentage(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${(Number(value) * 100).toFixed(1)}%`;
}

export async function getDataDateRange(): Promise<{min_date: string, max_date: string} | null> {
  // Get date range where inventory on_hand_units > 0
  const { data, error } = await supabase.rpc('get_fact_daily_raw', {
    p_location_code: 'ALL',
    p_sku: 'ALL',
    p_start_date: null,
    p_end_date: null
  });
  
  if (error) {
    console.error("Error fetching data date range:", error);
    return null;
  }
  
  if (!data || data.length === 0) {
    return null;
  }
  
  // Filter to only dates with inventory > 0
  const inventoryDates = data
    .filter((row: any) => row.on_hand_units > 0)
    .map((row: any) => row.d);
  
  if (inventoryDates.length === 0) {
    return null;
  }
  
  const minDate = inventoryDates.reduce((min: string, d: string) => d < min ? d : min);
  const maxDate = inventoryDates.reduce((max: string, d: string) => d > max ? d : max);
  
  return { min_date: minDate, max_date: maxDate };
}

export interface OptimalScope {
  dateRange: { start: string; end: string };
  topSkus: Array<{ sku: string; name: string; totalSales: number }>;
  location: string;
  metrics: {
    dataCompleteness: number;
    skuCoverage: number;
    totalSales: number;
    overlapScore: number;
  };
}

export interface ContiguousDateRange {
  startDate: string;
  endDate: string;
  validDates: Set<string>;
  totalDays: number;
  validDaysCount: number;
  completeness: number; // percentage of days with complete data
}

/**
 * Find the date range from first to last date with both sales and inventory
 * Returns the full span from earliest to latest valid date
 */
export async function getContiguousValidDateRange(
  locationCode?: string,
  sku?: string
): Promise<ContiguousDateRange | null> {
  const { data, error } = await supabase.rpc('get_fact_daily_raw', {
    p_location_code: locationCode || 'ALL',
    p_sku: sku || 'ALL',
    p_start_date: null,
    p_end_date: null
  });
  
  if (error || !data || data.length === 0) {
    console.error("Error fetching valid dates:", error);
    return null;
  }
  
  // Find inventory bounds (first and last date with inventory > 0)
  const inventoryDates = data
    .filter((row: any) => row.on_hand_units > 0)
    .map((row: any) => row.d)
    .sort();
  
  // Find sales bounds (first and last date with sales > 0)
  const salesDates = data
    .filter((row: any) => row.units_sold > 0)
    .map((row: any) => row.d)
    .sort();
  
  if (inventoryDates.length === 0 || salesDates.length === 0) {
    console.error('No dates found with inventory or sales');
    return null;
  }
  
  // Calculate intersection: latest start date and earliest end date
  const firstInventoryDate = inventoryDates[0];
  const lastInventoryDate = inventoryDates[inventoryDates.length - 1];
  const firstSalesDate = salesDates[0];
  const lastSalesDate = salesDates[salesDates.length - 1];
  
  const startDate = firstInventoryDate > firstSalesDate ? firstInventoryDate : firstSalesDate;
  const endDate = lastInventoryDate < lastSalesDate ? lastInventoryDate : lastSalesDate;
  
  // Verify we have a valid range
  if (startDate > endDate) {
    console.error('No overlapping date range between inventory and sales');
    return null;
  }
  
  // Within this range, find dates with BOTH sales AND inventory
  const validDatesArray = data
    .filter((row: any) => 
      row.d >= startDate && 
      row.d <= endDate && 
      row.on_hand_units > 0 && 
      row.units_sold > 0
    )
    .map((row: any) => row.d)
    .filter((date: string, index: number, self: string[]) => self.indexOf(date) === index) // unique dates
    .sort();
  
  const validDatesSet = new Set(validDatesArray);
  
  // Calculate total days in the span
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const validDaysCount = validDatesArray.length;
  const completeness = (validDaysCount / totalDays) * 100;
  
  return {
    startDate,
    endDate,
    validDates: validDatesSet,
    totalDays,
    validDaysCount,
    completeness: Math.round(completeness)
  };
}

/**
 * Get valid dates that have both sales and inventory data
 * Used to disable date picker dates without complete data
 * @deprecated Use getContiguousValidDateRange for better date range handling
 */
export async function getValidDates(
  locationCode?: string,
  sku?: string
): Promise<Set<string>> {
  const result = await getContiguousValidDateRange(locationCode, sku);
  return result?.validDates || new Set();
}

export async function findOptimalSimulationScope(): Promise<OptimalScope | null> {
  try {
    // Get all locations
    const locations = await fetchLocations();
    if (locations.length === 0) return null;

    // Get date range (last 18 months or all available data)
    const dateRange = await getDataDateRange();
    if (!dateRange) return null;

    const endDate = new Date(dateRange.max_date);
    const startDate = new Date(dateRange.min_date);
    const eighteenMonthsAgo = new Date(endDate);
    eighteenMonthsAgo.setMonth(endDate.getMonth() - 18);
    
    const searchStartDate = startDate > eighteenMonthsAgo ? startDate : eighteenMonthsAgo;

    let bestScope: OptimalScope | null = null;
    let bestScore = 0;

    // Check each location
    for (const location of locations) {
      // Fetch all data for this location
      const { data, error } = await supabase.rpc('get_fact_daily_raw', {
        p_location_code: location.code,
        p_sku: 'ALL',
        p_start_date: searchStartDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      });

      if (error || !data || data.length === 0) continue;

      // Slide 90-day windows across the data
      const windowDays = 90;
      let currentStart = new Date(searchStartDate);
      
      while (currentStart <= new Date(endDate.getTime() - windowDays * 24 * 60 * 60 * 1000)) {
        const currentEnd = new Date(currentStart);
        currentEnd.setDate(currentEnd.getDate() + windowDays);

        const windowStartStr = currentStart.toISOString().split('T')[0];
        const windowEndStr = currentEnd.toISOString().split('T')[0];

        // Filter data to window
        const windowData = data.filter((row: any) => 
          row.d >= windowStartStr && row.d <= windowEndStr
        );

        if (windowData.length === 0) {
          currentStart.setDate(currentStart.getDate() + 7); // Move window by 7 days
          continue;
        }

        // Calculate metrics
        const uniqueDates = new Set(windowData.map((row: any) => row.d));
        const dataCompleteness = (uniqueDates.size / windowDays) * 100;

        const skusWithSales = new Set(
          windowData.filter((row: any) => row.units_sold > 0).map((row: any) => row.sku)
        );
        const skusWithInventory = new Set(
          windowData.filter((row: any) => row.on_hand_units > 0).map((row: any) => row.sku)
        );
        const skusWithBoth = new Set(
          [...skusWithSales].filter(sku => skusWithInventory.has(sku))
        );
        const allSkus = new Set([...skusWithSales, ...skusWithInventory]);

        const overlapScore = allSkus.size > 0 ? (skusWithBoth.size / allSkus.size) * 100 : 0;
        const skuCoverage = allSkus.size;

        const totalSales = windowData.reduce((sum: number, row: any) => sum + (row.units_sold || 0), 0);

        // Calculate composite score (weighted)
        // Normalize sales (assume max 10000 units per window for normalization)
        const normalizedSales = Math.min(totalSales / 10000, 1) * 100;
        const score = (overlapScore * 0.4) + (dataCompleteness * 0.3) + (normalizedSales * 0.3);

        // Only consider windows with >50% overlap and >1000 sales
        if (overlapScore > 50 && totalSales > 1000 && score > bestScore) {
          // Get top SKUs by sales
          const skuSalesMap = new Map<string, number>();
          windowData.forEach((row: any) => {
            const current = skuSalesMap.get(row.sku) || 0;
            skuSalesMap.set(row.sku, current + (row.units_sold || 0));
          });

          const topSkusList = Array.from(skuSalesMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);

          // Get product names
          const products = await fetchProducts();
          const topSkus = topSkusList.map(([sku, sales]) => ({
            sku,
            name: products.find(p => p.sku === sku)?.name || sku,
            totalSales: sales
          }));

          bestScore = score;
          bestScope = {
            dateRange: { start: windowStartStr, end: windowEndStr },
            topSkus,
            location: location.code,
            metrics: {
              dataCompleteness: Math.round(dataCompleteness),
              skuCoverage: skuCoverage,
              totalSales: totalSales,
              overlapScore: Math.round(overlapScore)
            }
          };
        }

        // Move window by 7 days
        currentStart.setDate(currentStart.getDate() + 7);
      }
    }

    return bestScope;
  } catch (error) {
    console.error("Error finding optimal scope:", error);
    return null;
  }
}
