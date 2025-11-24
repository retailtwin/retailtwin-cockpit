import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { FilterBar } from "@/components/FilterBar";
import { InventoryGraph } from "@/components/InventoryGraph";
import { KPITable } from "@/components/KPITable";
import { KPICard } from "@/components/KPICard";
import { ConsultativeInsights } from "@/components/ConsultativeInsights";
import { ArchieChatDock } from "@/components/ArchieChatDock";
import { ArchieFloatingButton } from "@/components/ArchieFloatingButton";
import { ParetoReportModal } from "@/components/ParetoReportModal";
import { SimulationStatusBar } from "@/components/SimulationStatusBar";
import { SimulationConfigDialog, SimulationConfig } from "@/components/SimulationConfigDialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Play, Settings, ChevronDown, ChevronUp } from "lucide-react";
import archieLogo from "@/assets/archie-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  fetchLocations,
  fetchProducts,
  fetchKPIData,
  fetchFactDaily,
  fetchDBMCalculations,
  fetchLocationOrderDays,
  getDataDateRange,
  findOptimalSimulationScope,
  formatCurrency,
  formatNumber,
  Location,
  Product,
  KPIData,
  FactDaily,
  OptimalScope,
} from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [factDaily, setFactDaily] = useState<FactDaily[]>([]);
  const [agentDockOpen, setAgentDockOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preloadedPrompt, setPreloadedPrompt] = useState<string>("");
  const [dbmCalculations, setDbmCalculations] = useState([]);
  const [paretoModalOpen, setParetoModalOpen] = useState(false);
  const [isRunningDBM, setIsRunningDBM] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [simulationStats, setSimulationStats] = useState<{
    totalSkus: number;
    processedSkus: number;
    zeroSalesSkus: number;
    noInventorySkus: number;
  } | null>(null);
  const [productionLeadTime, setProductionLeadTime] = useState<number | undefined>();
  const [shippingLeadTime, setShippingLeadTime] = useState<number | undefined>();
  const [orderDays, setOrderDays] = useState<string | undefined>();
  const [dataDateRange, setDataDateRange] = useState<{min: Date, max: Date} | null>(null);
  const [simulationConfigOpen, setSimulationConfigOpen] = useState(false);
  const [simulationScope, setSimulationScope] = useState<SimulationConfig | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'running' | 'polling' | 'complete'>('idle');
  const [periodStats, setPeriodStats] = useState<{
    totalSkus: number;
    totalSales: number;
    daysWithData: number;
    avgDailySales: number;
  } | null>(null);
  const [optimalScope, setOptimalScope] = useState<OptimalScope | null>(null);
  const [isLoadingOptimalScope, setIsLoadingOptimalScope] = useState(false);

  // Check admin status and load settings
  useEffect(() => {
    const initializeData = async () => {
      checkAdminStatus();
      loadSettings();
      // Load optimal scope first, then fetch boundaries
      await loadOptimalScope();
      fetchDataDateRange();
    };
    initializeData();
  }, []);

  const loadOptimalScope = async () => {
    setIsLoadingOptimalScope(true);
    try {
      const optimal = await findOptimalSimulationScope();
      if (optimal) {
        setOptimalScope(optimal);
        
        // Auto-select optimal date range and location
        setDateRange({
          from: new Date(optimal.dateRange.start),
          to: new Date(optimal.dateRange.end)
        });
        setSelectedLocation(optimal.location);
        
        toast({
          title: "Optimal Scope Auto-Selected",
          description: `Found best period: ${optimal.metrics.dataCompleteness}% data coverage, ${optimal.metrics.totalSales.toLocaleString()} units sold`,
        });
      }
    } catch (error) {
      console.error("Error loading optimal scope:", error);
    } finally {
      setIsLoadingOptimalScope(false);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!roles);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("scope", "global")
        .in("setting_key", ["production_lead_time_global", "shipping_lead_time"]);

      if (error) throw error;

      data?.forEach((setting) => {
        const value = parseInt(String(setting.setting_value));
        if (setting.setting_key === "production_lead_time_global") {
          setProductionLeadTime(value);
        } else if (setting.setting_key === "shipping_lead_time") {
          setShippingLeadTime(value);
        }
      });
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const fetchDataDateRange = async () => {
    const { data, error } = await supabase.rpc('get_data_date_range');
    if (data && data.length > 0) {
      const minDate = new Date(data[0].min_date);
      const maxDate = new Date(data[0].max_date);
      
      setDataDateRange({
        min: minDate,
        max: maxDate
      });
      // Date range is now set by optimal scope detection
    }
  };

  // Load locations and products on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [locsData, prodsData] = await Promise.all([
          fetchLocations(),
          fetchProducts(),
        ]);

        setLocations(locsData);
        setProducts(prodsData);

        // Default to "ALL" for both location and product
        if (locsData.length > 0 && prodsData.length > 0) {
          setSelectedLocation("ALL");
          setSelectedProduct("ALL");
        }
        
        // Load date range and set default to full inventory range
        await fetchDataDateRange();
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast({
          title: "Error loading data",
          description:
            "Could not load locations and products. Please refresh.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [toast]);

  // Load KPI and fact data when filters change
  useEffect(() => {
    if (!selectedLocation || !selectedProduct) return;

    const loadData = async () => {
      try {
        const startDate = dateRange?.from
          ? format(dateRange.from, "yyyy-MM-dd")
          : undefined;
        const endDate = dateRange?.to
          ? format(dateRange.to, "yyyy-MM-dd")
          : undefined;

        const [kpi, facts] = await Promise.all([
          fetchKPIData(selectedLocation, selectedProduct, startDate, endDate),
          fetchFactDaily(selectedLocation, selectedProduct, startDate, endDate),
        ]);

        console.log("📊 KPI Data:", kpi);
        console.log("💰 MTV:", kpi?.mtv, "RIV:", kpi?.riv);
        console.log("📅 Date Range:", startDate, "to", endDate);

        setKpiData(kpi);
        setFactDaily(facts);
        await fetchDBMCalculations();
      } catch (error) {
        console.error("Error loading KPI data:", error);
        toast({
          title: "Error loading KPI data",
          description: "Could not load data for selected filters.",
          variant: "destructive",
        });
      }
    };

    loadData();
  }, [selectedLocation, selectedProduct, dateRange, toast]);

  // Load order days when location changes
  useEffect(() => {
    if (!selectedLocation) return;

    const loadOrderDays = async () => {
      try {
        const days = await fetchLocationOrderDays(selectedLocation);
        setOrderDays(days || undefined);
      } catch (error) {
        console.error("Error loading order days:", error);
      }
    };

    loadOrderDays();
  }, [selectedLocation]);

  const handleAskArchie = (prompt: string) => {
    setPreloadedPrompt(prompt);
    setAgentDockOpen(true);
  };

  const handleViewParetoReport = () => {
    setParetoModalOpen(true);
  };

  const fetchDBMCalculations = async () => {
    try {
      const selectedSKU = selectedProduct !== "ALL" ? selectedProduct : null;
      const selectedLoc = selectedLocation !== "ALL" ? selectedLocation : null;
      
      let query = supabase
        .from('dbm_calculations')
        .select('*')
        .order('calculation_date', { ascending: true });

      if (selectedSKU) {
        query = query.eq('sku', selectedSKU);
      }
      if (selectedLoc) {
        query = query.eq('location_code', selectedLoc);
      }
      if (dateRange?.from) {
        query = query.gte('calculation_date', format(dateRange.from, "yyyy-MM-dd"));
      }
      if (dateRange?.to) {
        query = query.lte('calculation_date', format(dateRange.to, "yyyy-MM-dd"));
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setDbmCalculations(data || []);
    } catch (error) {
      console.error('Error fetching DBM calculations:', error);
    }
  };

  const handleOpenSimulationConfig = () => {
    setSimulationConfigOpen(true);
  };

  const handleSimulationConfirm = async (config: SimulationConfig) => {
    setSimulationScope(config);
    
    // Validate scope before running
    const isValid = await validateSimulationScope(config);
    if (isValid) {
      runDBMAnalysis(config);
    }
  };

  const validateSimulationScope = async (config: SimulationConfig): Promise<boolean> => {
    try {
      const startDate = config.dateRange?.from
        ? format(config.dateRange.from, "yyyy-MM-dd")
        : (dataDateRange ? format(dataDateRange.min, "yyyy-MM-dd") : "2023-01-01");
      const endDate = config.dateRange?.to
        ? format(config.dateRange.to, "yyyy-MM-dd")
        : (dataDateRange ? format(dataDateRange.max, "yyyy-MM-dd") : "2023-12-31");

      const skuParam = config.productSKUs === 'ALL' ? 'ALL' : config.productSKUs[0] || 'ALL';

      // Query for period statistics
      const { data: rawData, error } = await supabase.rpc('get_fact_daily_raw', {
        p_location_code: config.location,
        p_sku: skuParam,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;

      if (!rawData || rawData.length === 0) {
        toast({
          title: "No Data Available",
          description: "Selected period has no inventory data. Please choose a different date range.",
          variant: "destructive",
        });
        return false;
      }

      // Calculate statistics
      const totalSales = rawData.reduce((sum: number, row: any) => sum + (row.units_sold || 0), 0);
      const uniqueSkus = new Set(rawData.map((row: any) => row.sku)).size;
      const daysWithData = new Set(rawData.map((row: any) => row.d)).size;
      const avgDailySales = daysWithData > 0 ? totalSales / daysWithData : 0;
      
      // Calculate data completeness
      const expectedDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      const dataCompleteness = expectedDays > 0 ? (daysWithData / expectedDays) * 100 : 0;

      setPeriodStats({
        totalSkus: uniqueSkus,
        totalSales,
        daysWithData,
        avgDailySales
      });

      // Warn if no sales
      if (totalSales === 0) {
        toast({
          title: "No Sales Data",
          description: `Selected period (${startDate} to ${endDate}) has ZERO sales${skuParam !== 'ALL' ? ` for SKU ${skuParam}` : ''}. Simulation will show 0% variance. Try selecting "All Products" or a different date range like Q1 2022 (Jan-Mar 2022).`,
          variant: "destructive",
          duration: 10000,
        });
        return false;
      }

      // Compare with optimal scope if available
      if (optimalScope) {
        const qualityDrop = optimalScope.metrics.dataCompleteness - dataCompleteness;
        const salesDrop = ((optimalScope.metrics.totalSales - totalSales) / optimalScope.metrics.totalSales) * 100;
        
        if (qualityDrop > 20 || salesDrop > 50) {
          toast({
            title: "Sub-Optimal Period Selected",
            description: `Current selection has ${dataCompleteness.toFixed(0)}% data quality vs. optimal ${optimalScope.metrics.dataCompleteness}%. Consider using the auto-selected optimal period for best results.`,
            duration: 8000,
          });
        }
      }

      // Warn if very low sales
      if (avgDailySales < 1) {
        toast({
          title: "Low Sales Activity",
          description: `Selected period has minimal sales (${totalSales.toFixed(0)} units total, ${avgDailySales.toFixed(2)} per day). Results may show small variances. Consider selecting a busier period.`,
          duration: 8000,
        });
      }

      return true;
    } catch (error: any) {
      console.error("Validation error:", error);
      toast({
        title: "Validation Error",
        description: error.message || "Could not validate simulation scope",
        variant: "destructive",
      });
      return false;
    }
  };

  const runDBMAnalysis = async (config?: SimulationConfig) => {
    setIsRunningDBM(true);
    setSimulationResult(null);
    setSimulationStatus('running');
    
    // Use config if provided, otherwise use current filters
    const scopeConfig = config || {
      location: selectedLocation,
      productSKUs: selectedProduct === 'ALL' ? 'ALL' : [selectedProduct],
      dateRange: dateRange || { from: dataDateRange?.min, to: dataDateRange?.max },
      preset: "Current Filters"
    };
    
    try {
      console.log("=== SIMULATION DEBUG START ===");
      console.log("Scope config:", scopeConfig);
      
      const startDate = scopeConfig.dateRange?.from
        ? format(scopeConfig.dateRange.from, "yyyy-MM-dd")
        : (dataDateRange ? format(dataDateRange.min, "yyyy-MM-dd") : "2023-01-01");
      const endDate = scopeConfig.dateRange?.to
        ? format(scopeConfig.dateRange.to, "yyyy-MM-dd")
        : (dataDateRange ? format(dataDateRange.max, "yyyy-MM-dd") : "2023-12-31");

      // Determine SKU parameter for RPC call
      const skuParam = scopeConfig.productSKUs === 'ALL' ? 'ALL' : scopeConfig.productSKUs[0] || 'ALL';
      
      console.log("Parameters:", { 
        location: scopeConfig.location, 
        sku: skuParam, 
        startDate, 
        endDate 
      });
      
      // Check auth state
      const { data: { user } } = await supabase.auth.getUser();
      console.log("User authenticated:", !!user, "User ID:", user?.id);
      
      if (user) {
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        console.log("Is admin:", isAdmin);
      }

      // Fetch raw fact_daily data using scope config
      console.log("Fetching raw data via RPC...");
      const { data: rawData, error: fetchError } = await supabase.rpc('get_fact_daily_raw', {
        p_location_code: scopeConfig.location,
        p_sku: skuParam,
        p_start_date: startDate,
        p_end_date: endDate
      });

      console.log("RPC response - Data count:", rawData?.length, "Error:", fetchError);

      if (fetchError) throw fetchError;

      if (!rawData || rawData.length === 0) {
        throw new Error("No data found for selected filters");
      }

      // Show initial toast
      toast({
        title: "Simulation Started",
        description: `Processing ${rawData.length} records using ${scopeConfig.preset}...`,
      });

      // Call the dbm-calculator Edge Function - don't wait too long
      console.log("Invoking dbm-calculator edge function...");
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 25000)
      );
      
      const functionPromise = supabase.functions.invoke('dbm-calculator', {
        body: {
          location_code: scopeConfig.location,
          sku: skuParam,
          start_date: startDate,
          end_date: endDate
        }
      });

      let result: any = null;
      let timedOut = false;

      try {
        const { data, error } = await Promise.race([functionPromise, timeoutPromise]) as any;
        console.log("Edge function response - Data:", data, "Error:", error);
        if (error) throw error;
        result = data;
      } catch (error: any) {
        if (error.message === 'timeout') {
          timedOut = true;
          console.log("Edge function timed out, starting background polling...");
        } else {
          console.error("Edge function error:", error);
          throw error;
        }
      }

      // If we got a result immediately, process it
      if (result && !timedOut) {
        setSimulationResult(result);
        
        if (result?.summary) {
          setSimulationStats({
            totalSkus: result.summary.totalSkus || 0,
            processedSkus: result.summary.skuWithSales || result.summary.processed || 0,
            zeroSalesSkus: result.summary.zeroSalesSkus || 0,
            noInventorySkus: result.summary.noInventorySkus || 0,
          });
        }

        const processedCount = result?.summary?.processed ?? rawData.length;
        toast({
          title: "Simulation Complete!",
          description: `Processed ${processedCount} records. Filtered out ${result?.summary?.zeroSalesSkus || 0} zero-sales SKUs.`,
          duration: 5000,
        });

        setSimulationStatus('complete');

        // Reload data
        const [kpi, facts] = await Promise.all([
          fetchKPIData(selectedLocation, selectedProduct, startDate, endDate),
          fetchFactDaily(selectedLocation, selectedProduct, startDate, endDate),
        ]);
        setKpiData(kpi);
        setFactDaily(facts);
        setIsRunningDBM(false);
        
      } else {
        // Function timed out, poll for results
        setSimulationStatus('polling');
        toast({
          title: "Simulation Running",
          description: "Processing in background. Checking for results...",
        });

        // Poll for updated records
        let pollAttempts = 0;
        const maxAttempts = 15; // 15 attempts × 2 seconds = 30 seconds max
        
        const pollInterval = setInterval(async () => {
          pollAttempts++;
          
          try {
            // Check if economic_units have been updated (indicator that simulation ran)
            const { data: updatedData, error: pollError } = await supabase.rpc('get_fact_daily_raw', {
              p_location_code: scopeConfig.location,
              p_sku: skuParam,
              p_start_date: startDate,
              p_end_date: endDate
            });

            if (pollError) throw pollError;

            // Check if any records have economic_units calculated
            const hasResults = updatedData?.some((row: any) => 
              row.economic_units !== null && row.economic_units > 0
            );

            if (hasResults) {
              clearInterval(pollInterval);
              
              const recordsWithEconomic = updatedData?.filter((row: any) => 
                row.economic_units !== null && row.economic_units > 0
              ).length || 0;

              toast({
                title: "Simulation Complete!",
                description: `Successfully processed ${recordsWithEconomic} records with DBM calculations.`,
                duration: 5000,
              });

              setSimulationStatus('complete');

              // Reload data to show updated values
              const [kpi, facts] = await Promise.all([
                fetchKPIData(selectedLocation, selectedProduct, startDate, endDate),
                fetchFactDaily(selectedLocation, selectedProduct, startDate, endDate),
              ]);
              setKpiData(kpi);
              setFactDaily(facts);
              setIsRunningDBM(false);
            } else if (pollAttempts >= maxAttempts) {
              clearInterval(pollInterval);
              
              toast({
                title: "Simulation Timeout",
                description: "Simulation is taking longer than expected. Please refresh the page in a moment to see results.",
                variant: "destructive",
              });
              
              setSimulationStatus('idle');
              setIsRunningDBM(false);
            }
          } catch (pollError: any) {
            console.error("Polling error:", pollError);
            clearInterval(pollInterval);
            
            toast({
              title: "Polling Error",
              description: "Failed to check simulation status. Please refresh the page.",
              variant: "destructive",
            });
            
            setSimulationStatus('idle');
            setIsRunningDBM(false);
          }
        }, 2000); // Poll every 2 seconds
      }

    } catch (error: any) {
      console.error("=== SIMULATION ERROR ===");
      console.error("Error type:", error?.constructor?.name);
      console.error("Error message:", error?.message);
      console.error("Error details:", error);
      console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error("Stack:", error?.stack);
      
      setSimulationStatus('idle');
      toast({
        title: "Simulation Failed",
        description: error.message || "Failed to run DBM simulation",
        variant: "destructive",
      });
      setIsRunningDBM(false);
    }
  };

  // Test function to call edge function directly
  const testSimulation = async () => {
    try {
      console.log("=== TEST: Calling dbm-calculator ===");
      const { data, error } = await supabase.functions.invoke('dbm-calculator', {
        body: {
          location_code: "STORE001",
          sku: "ALL",
          start_date: "2022-01-11",
          end_date: "2022-02-10"
        }
      });
      console.log("TEST: Response data:", data);
      console.log("TEST: Response error:", error);
      toast({
        title: "Test Complete",
        description: error ? `Error: ${error.message}` : "Check console for results",
      });
    } catch (e: any) {
      console.error("TEST: Exception:", e);
      toast({
        title: "Test Failed",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  // Test RPC function availability
  const testRPC = async () => {
    try {
      console.log("=== TEST: Calling get_fact_daily_raw RPC ===");
      const { data, error } = await supabase.rpc('get_fact_daily_raw', {
        p_location_code: 'STORE001',
        p_sku: 'ALL',
        p_start_date: '2022-01-11',
        p_end_date: '2022-02-10'
      });
      console.log("RPC Test - Data count:", data?.length);
      console.log("RPC Test - First record:", data?.[0]);
      console.log("RPC Test - Error:", error);
      toast({
        title: "RPC Test Complete",
        description: error ? `Error: ${error.message}` : `Found ${data?.length || 0} records`,
      });
    } catch (e: any) {
      console.error("RPC TEST: Exception:", e);
      toast({
        title: "RPC Test Failed",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    if (factDaily.length === 0) {
      toast({
        title: "No data to export",
        description: "Please select a location and product with data.",
        variant: "destructive",
      });
      return;
    }

    // Convert to CSV
    const headers = [
      "Date",
      "Location",
      "Product",
      "Units Sold",
      "On Hand Units",
      "On Hand Units (Sim)",
    ];
    const rows = factDaily.map((row) => [
      row.d,
      row.location_code,
      row.sku,
      row.units_sold,
      row.on_hand_units ?? "",
      row.on_hand_units_sim ?? "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedLocation}_${selectedProduct}_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "CSV exported",
      description: "Your data has been downloaded.",
    });
  };

  // Prepare table data with new structure: Current, Simulated, Var% columns
  // Simulated Throughput = Current TCM + MTV (since MTV = Simulated - Current)
  const simulatedTCM =
    (kpiData?.tcm || 0) + (kpiData?.mtv || 0);
  const throughputVariancePct =
    kpiData?.tcm && kpiData.tcm !== 0
      ? ((simulatedTCM / kpiData.tcm - 1) * 100).toFixed(1) + "%"
      : "—";

  const tableData = kpiData
    ? {
        metrics: [
          {
            metric: "Throughput (Cash Margin)",
            singleValue: null,
            current: formatCurrency(kpiData.tcm),
            simulated:
              kpiData.mtv !== null && kpiData.tcm !== null
                ? formatCurrency(simulatedTCM)
                : "—",
            variance: throughputVariancePct,
          },
          {
            metric: "Service Level",
            singleValue: null,
            current: (kpiData.service_level * 100).toFixed(1) + "%",
            simulated: (kpiData.service_level_sim * 100).toFixed(1) + "%",
            variance:
              kpiData.service_level > 0
                ? (
                    (kpiData.service_level_sim / kpiData.service_level - 1) *
                    100
                  ).toFixed(1) + "%"
                : "—",
          },
          {
            metric: "Avg Inventory",
            singleValue: null,
            current: formatCurrency(
              kpiData.turns_current > 0
                ? kpiData.tcm / kpiData.turns_current
                : 0
            ),
            simulated: formatCurrency(
              kpiData.turns_sim > 0
                ? kpiData.tcm / kpiData.turns_sim
                : 0
            ),
            variance:
              kpiData.turns_current > 0 && kpiData.turns_sim > 0
                ? (
                    ((kpiData.tcm / kpiData.turns_sim) / (kpiData.tcm / kpiData.turns_current) - 1) *
                    100
                  ).toFixed(1) + "%"
                : "—",
          },
          {
            metric: "Inventory Turns",
            singleValue: null,
            current: formatNumber(kpiData.turns_current, 1),
            simulated: formatNumber(kpiData.turns_sim, 1),
            variance:
              kpiData.turns_current && kpiData.turns_sim
                ? (
                    (kpiData.turns_sim / kpiData.turns_current - 1) *
                    100
                  ).toFixed(1) + "%"
                : "—",
          },
        ],
        bottomMetrics: [
          {
            metric: "Missed Throughput Value (MTV)",
            value: formatCurrency(kpiData.mtv),
          },
          {
            metric: "Redundant Inventory Value (RIV)",
            value: formatCurrency(kpiData.riv),
          },
        ],
        cashGap: formatCurrency(
          (kpiData.mtv || 0) + (kpiData.riv || 0)
        ),
      }
    : null;

  const summaryMetrics = kpiData
    ? {
        locations: selectedLocation === "ALL" ? locations.length : 1,
        skus: selectedProduct === "ALL" ? products.length : 1,
        days: kpiData.days_total,
        skuLocDays: kpiData.sku_loc_days,
        serviceLevel: (kpiData.service_level * 100).toFixed(1),
        serviceLevelSimulated: (kpiData.service_level_sim * 100).toFixed(1),
      }
    : {
        locations: 0,
        skus: 0,
        days: 0,
        skuLocDays: 0,
        serviceLevel: "0.0",
        serviceLevelSimulated: "0.0",
      };

  // Prepare graph data with target units
  const inventoryFlowData = factDaily.map((row) => ({
    day: new Date(row.d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    sales: Number(row.units_sold),
    inventory: Number(row.on_hand_units ?? 0),
    inventorySimulated: Number(row.on_hand_units_sim ?? 0),
    targetUnits: Number(row.target_units ?? 0),
    economicUnits: Number(row.economic_units ?? 0),
  }));

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8 pb-16 flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-lg">Loading dashboard data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 pb-16">
        <div className="space-y-6">
          {/* Top Bar with Title and Agent Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Simulation Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedLocation === "ALL" && selectedProduct === "ALL"
                  ? "Aggregated view: All Locations & All Products"
                  : selectedLocation === "ALL"
                  ? `Aggregated view: All Locations for ${
                      products.find((p) => p.sku === selectedProduct)?.name ||
                      selectedProduct
                    }`
                  : selectedProduct === "ALL"
                  ? `Aggregated view: All Products at ${
                      locations.find((l) => l.code === selectedLocation)?.name ||
                      selectedLocation
                    }`
                  : "Real-time KPIs based on 21-day rolling averages"}
              </p>
            </div>
            <Button
              onClick={() => setAgentDockOpen(!agentDockOpen)}
              className="h-11 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 bg-primary hover:bg-primary/90"
            >
              <div className="flex items-center gap-2">
                <img src={archieLogo} alt="Archie" className="h-5 w-5 rounded-full object-cover" />
                <span className="font-medium">AI Assistant</span>
              </div>
            </Button>
          </div>

          {/* Scope Selection */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Scope Selection</h2>
            <FilterBar
              locations={locations}
              products={products}
              selectedLocation={selectedLocation}
              selectedProduct={selectedProduct}
              dateRange={dateRange}
              dataDateRange={dataDateRange}
              onLocationChange={setSelectedLocation}
              onProductChange={setSelectedProduct}
              onDateRangeChange={setDateRange}
            />
          </div>

          {/* Simulation Settings */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <SimulationStatusBar
                hasSimulation={!!simulationResult}
                productionLeadTime={productionLeadTime}
                shippingLeadTime={shippingLeadTime}
                orderDays={orderDays}
                simulationStatus={simulationStatus}
              />
              
              <div className="flex justify-end gap-2">
                {isAdmin && (
                  <Button
                    onClick={() => navigate('/settings', { state: { defaultTab: 'config' } })}
                    variant="outline"
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                )}
                <Button onClick={handleExportCSV} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Run Simulation Button */}
          <div className="space-y-4">
            {/* Optimal Scope Info Panel */}
            {optimalScope && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    📊 Optimal Scope Auto-Selected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <div className="text-muted-foreground text-xs">Period</div>
                        <div className="font-medium">{format(new Date(optimalScope.dateRange.start), "MMM d")} - {format(new Date(optimalScope.dateRange.end), "MMM d, yyyy")}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Location</div>
                        <div className="font-medium">{optimalScope.location}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Data Quality</div>
                        <div className="font-medium text-green-600">{optimalScope.metrics.dataCompleteness}% complete</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">SKU Overlap</div>
                        <div className="font-medium text-green-600">{optimalScope.metrics.overlapScore}%</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">Top Products</div>
                      <div className="font-medium">{optimalScope.topSkus.length} SKUs • {optimalScope.metrics.totalSales.toLocaleString()} units sold</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {optimalScope.topSkus.slice(0, 3).map(s => s.sku).join(', ')}
                        {optimalScope.topSkus.length > 3 && ` +${optimalScope.topSkus.length - 3} more`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Period Statistics */}
            {periodStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Selected Period Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">SKUs</div>
                      <div className="text-2xl font-semibold">{periodStats.totalSkus}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total Sales</div>
                      <div className="text-2xl font-semibold">{periodStats.totalSales.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Days</div>
                      <div className="text-2xl font-semibold">{periodStats.daysWithData}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Daily Sales</div>
                      <div className="text-2xl font-semibold">{periodStats.avgDailySales.toFixed(1)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="flex justify-center">
              <Button
                onClick={handleOpenSimulationConfig}
                disabled={isRunningDBM}
                size="lg"
                className="gap-2 w-full max-w-md"
              >
                {isRunningDBM ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Configure & Run Simulation
                  </>
                )}
              </Button>
            </div>
            
            {/* Diagnostic Test Buttons */}
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testSimulation}
                disabled={isRunningDBM}
              >
                Test Edge Function
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={testRPC}
                disabled={isRunningDBM}
              >
                Test RPC
              </Button>
            </div>
          </div>

          {/* Simulation Results Display */}
          {simulationResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Simulation Results</CardTitle>
                    {simulationScope && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Scope: {simulationScope.preset} 
                        {simulationScope.dateRange?.from && simulationScope.dateRange?.to && (
                          <> • {format(simulationScope.dateRange.from, "MMM d")} - {format(simulationScope.dateRange.to, "MMM d, yyyy")}</>
                        )}
                        {simulationScope.location !== "ALL" && <> • {simulationScope.location}</>}
                        {simulationScope.productSKUs !== "ALL" && simulationScope.productSKUs.length > 0 && (
                          <> • {simulationScope.productSKUs.length} SKU{simulationScope.productSKUs.length > 1 ? 's' : ''}</>
                        )}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowResultDetails(!showResultDetails)}
                    className="gap-2"
                  >
                    {showResultDetails ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show Details
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="font-semibold">Total Records:</span>{" "}
                    {simulationResult.summary?.processed || 0}
                  </div>
                  <div>
                    <span className="font-semibold">Increases:</span>{" "}
                    <span className="text-green-600">{simulationResult.summary?.increases || 0}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Decreases:</span>{" "}
                    <span className="text-orange-600">{simulationResult.summary?.decreases || 0}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Unchanged:</span>{" "}
                    {(simulationResult.summary?.processed || 0) - (simulationResult.summary?.increases || 0) - (simulationResult.summary?.decreases || 0) - (simulationResult.summary?.new_items || 0)}
                  </div>
                </div>

                {showResultDetails && (
                  <div className="mt-4">
                    <div className="text-sm font-semibold mb-2">Raw JSON Response:</div>
                    <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[400px] text-xs">
                      {JSON.stringify(simulationResult, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {kpiData && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Throughput"
                  value={formatCurrency(kpiData.tcm)}
                  delta7d={
                    kpiData.tcm && kpiData.mtv !== null
                      ? (((kpiData.tcm + kpiData.mtv) / kpiData.tcm - 1) * 100)
                      : 0
                  }
                  tooltip="Total throughput (cash margin) generated from sales"
                />
                <KPICard
                  title="Service Level"
                  value={`${(kpiData.service_level * 100).toFixed(1)}%`}
                  delta7d={
                    kpiData.service_level > 0
                      ? ((kpiData.service_level_sim / kpiData.service_level - 1) * 100)
                      : 0
                  }
                  tooltip="Percentage of demand met without stockouts"
                />
                <KPICard
                  title="Inventory Turns"
                  value={formatNumber(kpiData.turns_current, 1)}
                  delta7d={
                    kpiData.turns_current && kpiData.turns_sim
                      ? ((kpiData.turns_sim / kpiData.turns_current - 1) * 100)
                      : 0
                  }
                  tooltip="How many times inventory is sold and replaced over the period"
                />
                <KPICard
                  title="Days to Cash"
                  value={
                    kpiData.tcm && kpiData.days_total
                      ? formatNumber((kpiData.riv || 0) / (kpiData.tcm / kpiData.days_total), 1)
                      : "—"
                  }
                  delta7d={
                    kpiData.tcm && kpiData.days_total && kpiData.riv && kpiData.riv_sim !== null
                      ? (() => {
                          const currentDaysToCash = kpiData.riv / (kpiData.tcm / kpiData.days_total);
                          const simulatedDaysToCash = kpiData.riv_sim / (kpiData.tcm / kpiData.days_total);
                          return ((simulatedDaysToCash / currentDaysToCash - 1) * 100);
                        })()
                      : 0
                  }
                  tooltip="Average number of days inventory takes to convert to cash"
                  invertColors={true}
                />
              </div>
            </div>
          )}

          {/* Graph and Table Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            <InventoryGraph data={inventoryFlowData} stats={simulationStats} />
            <KPITable data={tableData} summaryMetrics={summaryMetrics} />
          </div>

          {/* Consultative Insights */}
          {kpiData && (
            <ConsultativeInsights
              cashGap={formatCurrency(
                (kpiData.mtv || 0) + (kpiData.riv || 0)
              )}
              serviceLevelGain={
                (kpiData.service_level_sim - kpiData.service_level) * 100
              }
              turnsImprovement={
                kpiData.turns_sim && kpiData.turns_current
                  ? ((kpiData.turns_sim - kpiData.turns_current) /
                      kpiData.turns_current) *
                    100
                  : 0
              }
              stockoutReduction={
                kpiData.service_level < 1
                  ? (((1 - kpiData.service_level) -
                      (1 - kpiData.service_level_sim)) /
                      (1 - kpiData.service_level)) *
                    100
                  : 0
              }
              turnsCurrent={kpiData.turns_current}
              turnsSim={kpiData.turns_sim}
              onAskArchie={handleAskArchie}
              onViewParetoReport={handleViewParetoReport}
            />
          )}
        </div>
      </div>

      {/* Archie Chat Dock */}
      {agentDockOpen && (
        <ArchieChatDock
          onClose={() => {
            setAgentDockOpen(false);
            setPreloadedPrompt("");
          }}
          kpiContext={
            kpiData
              ? {
                  location: selectedLocation,
                  product: selectedProduct,
                  dateRange:
                    dateRange?.from && dateRange?.to
                      ? `${format(dateRange.from, "MMM d, yyyy")} - ${format(
                          dateRange.to,
                          "MMM d, yyyy"
                        )}`
                      : dataDateRange 
                        ? `${format(dataDateRange.min, "MMM d, yyyy")} - ${format(
                            dataDateRange.max,
                            "MMM d, yyyy"
                          )}`
                        : "All time",
                  dataDateRange: dataDateRange || undefined,
                  metrics: {
                    tcm: kpiData.tcm,
                    mtv: kpiData.mtv,
                    riv: kpiData.riv,
                    service_level: kpiData.service_level,
                    service_level_sim: kpiData.service_level_sim,
                    turns_current: kpiData.turns_current,
                    turns_sim: kpiData.turns_sim,
                  },
                }
              : undefined
          }
          preloadedPrompt={preloadedPrompt}
        />
      )}

      {/* Archie Floating Button */}
      <ArchieFloatingButton
        onClick={() => setAgentDockOpen(true)}
        isOpen={agentDockOpen}
        notificationCount={
          kpiData &&
          ((kpiData.mtv || 0) > 500 ||
            (kpiData.riv || 0) > 1000 ||
            kpiData.service_level < 0.95)
            ? 1
            : 0
        }
      />

      {/* Pareto Report Modal */}
      <ParetoReportModal
        isOpen={paretoModalOpen}
        onClose={() => setParetoModalOpen(false)}
        location={selectedLocation}
        sku={selectedProduct}
        endDate={
          dateRange?.to
            ? format(dateRange.to, "yyyy-MM-dd")
            : factDaily.length > 0
            ? factDaily[factDaily.length - 1].d
            : "2023-12-31"
        }
        onAskArchie={handleAskArchie}
        kpiData={
          kpiData
            ? {
                tcm: kpiData.tcm,
                mtv: kpiData.mtv,
                riv: kpiData.riv,
                service_level: kpiData.service_level,
                service_level_sim: kpiData.service_level_sim,
                turns_current: kpiData.turns_current,
                turns_sim: kpiData.turns_sim,
              }
            : undefined
        }
      />
      
      {/* Simulation Config Dialog */}
      <SimulationConfigDialog
        open={simulationConfigOpen}
        onOpenChange={setSimulationConfigOpen}
        onConfirm={handleSimulationConfirm}
      />
    </Layout>
  );
};

export default Dashboard;
