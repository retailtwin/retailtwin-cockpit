import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { FilterBar } from "@/components/FilterBar";
import { InventoryGraph } from "@/components/InventoryGraph";
import { KPITable } from "@/components/KPITable";
import { ConsultativeInsights } from "@/components/ConsultativeInsights";
import { ArchieChatDock } from "@/components/ArchieChatDock";
import { ArchieFloatingButton } from "@/components/ArchieFloatingButton";
import { ParetoReportModal } from "@/components/ParetoReportModal";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchLocations,
  fetchProducts,
  fetchKPIData,
  fetchFactDaily,
  formatCurrency,
  formatNumber,
  Location,
  Product,
  KPIData,
  FactDaily,
} from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

const Dashboard = () => {
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [factDaily, setFactDaily] = useState<FactDaily[]>([]);
  const [agentDockOpen, setAgentDockOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preloadedPrompt, setPreloadedPrompt] = useState<string>("");const [dbmCalculations, setDbmCalculations] = useState([]);
  const [dbmCalculations, setDbmCalculations] = useState([]);
  const [paretoModalOpen, setParetoModalOpen] = useState(false);
  const [isRunningDBM, setIsRunningDBM] = useState(false);

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

  const runDBMAnalysis = async () => {
    setIsRunningDBM(true);
    
    try {
      const startDate = dateRange?.from
        ? format(dateRange.from, "yyyy-MM-dd")
        : "2023-01-01";
      const endDate = dateRange?.to
        ? format(dateRange.to, "yyyy-MM-dd")
        : "2023-12-31";
      const locationCodes = selectedLocation !== "ALL" ? [selectedLocation] : undefined;
      const skus = selectedProduct !== "ALL" ? [selectedProduct] : undefined;

      const { data, error } = await supabase.functions.invoke('run-dbm-analysis', {
        body: {
          start_date: startDate,
          end_date: endDate,
          location_codes: locationCodes,
          skus: skus
        }
      });

      if (error) throw error;

      toast({
        title: "DBM Analysis Complete!",
        description: `Processed ${data.processed_count} SKU/Location combinations.`,
        duration: 5000,
      });

      // Reload data
      const [kpi, facts] = await Promise.all([
        fetchKPIData(selectedLocation, selectedProduct, startDate, endDate),
        fetchFactDaily(selectedLocation, selectedProduct, startDate, endDate),
      ]);
      setKpiData(kpi);
      setFactDaily(facts);

    } catch (error: any) {
      console.error("DBM Analysis Error:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to run DBM analysis",
        variant: "destructive",
      });
    } finally {
      setIsRunningDBM(false);
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

  // Prepare graph data
  const inventoryFlowData = factDaily.map((row) => ({
    day: new Date(row.d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    sales: Number(row.units_sold),
    inventory: Number(row.on_hand_units ?? 0),
    inventorySimulated: Number(row.on_hand_units_sim ?? 0),
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
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
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
              variant="outline"
              size="sm"
              onClick={() => setAgentDockOpen(!agentDockOpen)}
              className="gap-2"
            >
              AI Assistant
            </Button>
          </div>

          {/* Filters */}
          <FilterBar
            locations={locations}
            products={products}
            selectedLocation={selectedLocation}
            selectedProduct={selectedProduct}
            dateRange={dateRange}
            onLocationChange={setSelectedLocation}
            onProductChange={setSelectedProduct}
            onDateRangeChange={setDateRange}
          />

          {/* DBM Simulation Button */}
          <div className="flex justify-between items-center">
            <Button
              onClick={runDBMAnalysis}
              disabled={isRunningDBM}
              variant="default"
              className="gap-2"
            >
              {isRunningDBM ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Analysis...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Run DBM Simulation
                </>
              )}
            </Button>

            <Button onClick={handleExportCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Graph and Table Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            <InventoryGraph data={inventoryFlowData} />
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
                      : "All time",
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
            : format(new Date(), "yyyy-MM-dd")
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
    </Layout>
  );
};

export default Dashboard;
