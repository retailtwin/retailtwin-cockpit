import { useState } from "react";
import { Layout } from "@/components/Layout";
import { FilterBar } from "@/components/FilterBar";
import { NotificationBanner } from "@/components/NotificationBanner";
import { InventoryGraph } from "@/components/InventoryGraph";
import { KPITable } from "@/components/KPITable";
import { ConsultativeInsights } from "@/components/ConsultativeInsights";
import { AgentPromptDock } from "@/components/AgentPromptDock";
import { locations, products, kpiData, inventoryFlowData, summaryMetrics } from "@/lib/mockData";

const Dashboard = () => {
  const [selectedLocation, setSelectedLocation] = useState(locations[0]);
  const [selectedProduct, setSelectedProduct] = useState(products[0]);

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
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Supply Chain Dashboard
            </h1>
            <p className="text-muted-foreground">
              Real-time KPIs based on 21-day rolling averages
            </p>
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
            message="Stockout risk detected for Product Alpha at Store B. Consider adjusting buffer targets."
            type="warning"
          />

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
      <AgentPromptDock />
    </Layout>
  );
};

export default Dashboard;
