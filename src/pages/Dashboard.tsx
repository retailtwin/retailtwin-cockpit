import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { FilterBar } from "@/components/FilterBar";
import { InventoryGraph } from "@/components/InventoryGraph";
import { KPITable } from "@/components/KPITable";
import { ConsultativeInsights } from "@/components/ConsultativeInsights";
import { AgentPromptDock } from "@/components/AgentPromptDock";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
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
  FactDaily
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

  // Load locations and products on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [locsData, prodsData] = await Promise.all([
          fetchLocations(),
          fetchProducts()
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
          description: "Could not load locations and products. Please refresh.",
          variant: "destructive"
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
        const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
        const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;
        
        const [kpi, facts] = await Promise.all([
          fetchKPIData(selectedLocation, selectedProduct, startDate, endDate),
          fetchFactDaily(selectedLocation, selectedProduct, startDate, endDate)
        ]);
        
        console.log('📊 KPI Data:', kpi);
        console.log('💰 MTV:', kpi?.mtv, 'RIV:', kpi?.riv);
        console.log('📅 Date Range:', startDate, 'to', endDate);
        
        setKpiData(kpi);
        setFactDaily(facts);
      } catch (error) {
        console.error("Error loading KPI data:", error);
        toast({
          title: "Error loading KPI data",
          description: "Could not load data for selected filters.",
          variant: "destructive"
        });
      }
    };
    
    loadData();
  }, [selectedLocation, selectedProduct, dateRange, toast]);

  const handleExportCSV = () => {
    if (factDaily.length === 0) {
      toast({
        title: "No data to export",
        description: "Please select a location and product with data.",
        variant: "destructive"
      });
      return;
    }
    
    // Convert to CSV
    const headers = ["Date", "Location", "Product", "Units Sold", "On Hand Units", "On Hand Units (Sim)"];
    const rows = factDaily.map(row => [
      row.d,
      row.location_code,
      row.sku,
      row.units_sold,
      row.on_hand_units ?? "",
      row.on_hand_units_sim ?? ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedLocation}_${selectedProduct}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "CSV exported",
      description: "Your data has been downloaded."
    });
  };

  // Prepare table data with new structure: Current, Simulated, Var% columns
  const tableData = kpiData ? {
    metrics: [
      {
        metric: "Throughput (Cash Margin)",
        singleValue: null,
        current: formatCurrency(kpiData.tcm),
        simulated: kpiData.service_level > 0 
          ? formatCurrency((kpiData.tcm || 0) / kpiData.service_level)
          : "—",
        variance: kpiData.service_level > 0 
          ? ((((kpiData.tcm || 0) / kpiData.service_level) / (kpiData.tcm || 1) - 1) * 100).toFixed(1) + "%" 
          : "—",
      },
      {
        metric: "Service Level",
        singleValue: null,
        current: (kpiData.service_level * 100).toFixed(1) + "%",
        simulated: (kpiData.service_level_sim * 100).toFixed(1) + "%",
        variance: kpiData.service_level > 0
          ? ((kpiData.service_level_sim / kpiData.service_level - 1) * 100).toFixed(1) + "%"
          : "—",
      },
      {
        metric: "Inventory Turns",
        singleValue: null,
        current: formatNumber(kpiData.turns_current, 1),
        simulated: formatNumber(kpiData.turns_sim, 1),
        variance: kpiData.turns_current && kpiData.turns_sim 
          ? ((kpiData.turns_sim / kpiData.turns_current - 1) * 100).toFixed(1) + "%" 
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
    cashGap: formatCurrency((kpiData.mtv || 0) + (kpiData.riv || 0)),
  } : null;

  const summaryMetrics = kpiData ? {
    locations: selectedLocation === 'ALL' ? locations.length : 1,
    skus: selectedProduct === 'ALL' ? products.length : 1,
    days: kpiData.days_total,
    skuLocDays: kpiData.sku_loc_days,
    serviceLevel: (kpiData.service_level * 100).toFixed(1),
    serviceLevelSimulated: (kpiData.service_level_sim * 100).toFixed(1),
  } : {
    locations: 0,
    skus: 0,
    days: 0,
    skuLocDays: 0,
    serviceLevel: "0.0",
    serviceLevelSimulated: "0.0",
  };

  // Prepare graph data
  const inventoryFlowData = factDaily.map(row => ({
    day: new Date(row.d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
                {selectedLocation === 'ALL' && selectedProduct === 'ALL' 
                  ? 'Aggregated view: All Locations & All Products'
                  : selectedLocation === 'ALL'
                  ? `Aggregated view: All Locations for ${products.find(p => p.sku === selectedProduct)?.name || selectedProduct}`
                  : selectedProduct === 'ALL'
                  ? `Aggregated view: All Products at ${locations.find(l => l.code === selectedLocation)?.name || selectedLocation}`
                  : 'Real-time KPIs based on 21-day rolling averages'}
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

          {/* Export Button */}
          <div className="flex justify-end">
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
              cashGap={formatCurrency(kpiData.mtv)}
              serviceLevelGain={(kpiData.service_level_sim - kpiData.service_level) * 100}
              turnsImprovement={kpiData.turns_sim && kpiData.turns_current 
                ? ((kpiData.turns_sim - kpiData.turns_current) / kpiData.turns_current) * 100 
                : 0}
              stockoutReduction={0}
            />
          )}
        </div>
      </div>

      {/* Agent Prompt Dock */}
      {agentDockOpen && <AgentPromptDock onClose={() => setAgentDockOpen(false)} />}
    </Layout>
  );
};

export default Dashboard;