import { useState } from "react";
import { Layout } from "@/components/Layout";
import { FilterBar } from "@/components/FilterBar";
import { NotificationBanner } from "@/components/NotificationBanner";
import { InventoryGraph } from "@/components/InventoryGraph";
import { KPITable } from "@/components/KPITable";
import { ConsultativeInsights } from "@/components/ConsultativeInsights";
import { AgentPromptDock } from "@/components/AgentPromptDock";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { locations, products, kpiData, inventoryFlowData, summaryMetrics } from "@/lib/mockData";

const Dashboard = () => {
  const [selectedLocation, setSelectedLocation] = useState(locations[0]);
  const [selectedProduct, setSelectedProduct] = useState(products[0]);
  const [agentDockOpen, setAgentDockOpen] = useState(false);

  const handleExportCSV = () => {
    // Placeholder for CSV export functionality
    console.log("Export CSV clicked");
  };

  // Calculate cash gap
  const mtvValue = parseFloat(kpiData.missedThroughputValue.value.replace(/[€K,]/g, ""));
  const rivValue = parseFloat(kpiData.redundantInventoryValue.value.replace(/[€K,]/g, ""));
  const cashGap = `€${(mtvValue + rivValue).toFixed(0)}K`;

  // Prepare table data
  const tableData = [
    {
      metric: "Throughput Cash Margin",
      current: kpiData.throughputCashMargin.value,
      simulated: "€892K",
      delta: kpiData.throughputCashMargin.delta7d,
    },
    {
      metric: "Inventory Turns",
      current: kpiData.turnsCurrent.value,
      simulated: kpiData.turnsSimulated.value,
      delta: kpiData.turnsCurrent.delta7d,
    },
    {
      metric: "Stockout Days",
      current: kpiData.stockoutDaysCurrent.value,
      simulated: kpiData.stockoutDaysSimulated.value,
      delta: kpiData.stockoutDaysCurrent.delta7d,
    },
    {
      metric: "Missed Throughput Value",
      current: kpiData.missedThroughputValue.value,
      simulated: kpiData.missedThroughputValueSimulated.value,
      delta: kpiData.missedThroughputValue.delta7d,
    },
    {
      metric: "Redundant Inventory Value",
      current: kpiData.redundantInventoryValue.value,
      simulated: kpiData.redundantInventoryValueSimulated.value,
      delta: kpiData.redundantInventoryValue.delta7d,
    },
    {
      metric: "Cash Gap",
      current: cashGap,
      simulated: "€170K",
      delta: -15.8,
    },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 pb-16">
        <div className="space-y-6">
          {/* Top Bar with Title and Agent Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time KPIs based on 21-day rolling averages
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

          {/* Notification Banner */}
          <NotificationBanner
            message="6 Orders may need to be checked as Closed"
            type="info"
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
          <ConsultativeInsights 
            cashGap={cashGap}
            serviceLevelGain={summaryMetrics.serviceLevelSimulated - summaryMetrics.serviceLevel}
            turnsImprovement={((kpiData.turnsSimulated.value as number - (kpiData.turnsCurrent.value as number)) / (kpiData.turnsCurrent.value as number)) * 100}
            stockoutReduction={Math.abs((kpiData.stockoutDaysSimulated.value as number - (kpiData.stockoutDaysCurrent.value as number)) / (kpiData.stockoutDaysCurrent.value as number)) * 100}
          />
        </div>
      </div>

      {/* Agent Prompt Dock */}
      {agentDockOpen && <AgentPromptDock onClose={() => setAgentDockOpen(false)} />}
    </Layout>
  );
};

export default Dashboard;
