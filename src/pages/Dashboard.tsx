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

const Dashboard = () => {
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
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
        const [kpi, facts] = await Promise.all([
          fetchKPIData(selectedLocation, selectedProduct),
          fetchFactDaily(selectedLocation, selectedProduct)
        ]);
        
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
  }, [selectedLocation, selectedProduct, toast]);

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

  // Prepare table data
  const tableData = kpiData ? [
    {
      metric: "Throughput Cash Margin",
      current: formatCurrency(kpiData.tcm),
      simulated: "—",
    },
    {
      metric: "Inventory Turns (Current)",
      current: formatNumber(kpiData.turns_current, 1),
      simulated: "—",
    },
    {
      metric: "Inventory Turns (Simulated)",
      current: "—",
      simulated: formatNumber(kpiData.turns_sim, 1),
    },
    {
      metric: "Service Level (Current)",
      current: (kpiData.service_level * 100).toFixed(1) + "%",
      simulated: "—",
    },
    {
      metric: "Service Level (Simulated)",
      current: "—",
      simulated: (kpiData.service_level_sim * 100).toFixed(1) + "%",
    },
    {
      metric: "Missed Throughput Value",
      current: formatCurrency(kpiData.mtv),
      simulated: "—",
    },
  ] : [];

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
            onLocationChange={setSelectedLocation}
            onProductChange={setSelectedProduct}
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
