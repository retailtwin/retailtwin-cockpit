import { useState } from "react";
import { Layout } from "@/components/Layout";
import { FilterBar } from "@/components/FilterBar";
import { NotificationBanner } from "@/components/NotificationBanner";
import { KPICard } from "@/components/KPICard";
import { AgentPromptDock } from "@/components/AgentPromptDock";
import { locations, products, kpiData } from "@/lib/mockData";

const Dashboard = () => {
  const [selectedLocation, setSelectedLocation] = useState(locations[0]);
  const [selectedProduct, setSelectedProduct] = useState(products[0]);

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

          {/* KPI Grid - 2 rows × 3 columns */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Row 1 */}
            <KPICard
              title="Throughput Cash Margin"
              value={kpiData.throughputCashMargin.value}
              delta7d={kpiData.throughputCashMargin.delta7d}
              sparklineSeries={kpiData.throughputCashMargin.sparkline}
              tooltip={kpiData.throughputCashMargin.tooltip}
            />
            <KPICard
              title="Turns (Current)"
              value={kpiData.turnsCurrent.value}
              delta7d={kpiData.turnsCurrent.delta7d}
              sparklineSeries={kpiData.turnsCurrent.sparkline}
              tooltip={kpiData.turnsCurrent.tooltip}
            />
            <KPICard
              title="Turns (Simulated)"
              value={kpiData.turnsSimulated.value}
              delta7d={kpiData.turnsSimulated.delta7d}
              sparklineSeries={kpiData.turnsSimulated.sparkline}
              tooltip={kpiData.turnsSimulated.tooltip}
            />

            {/* Row 2 */}
            <KPICard
              title="Stockout Days (Current)"
              value={kpiData.stockoutDaysCurrent.value}
              delta7d={kpiData.stockoutDaysCurrent.delta7d}
              sparklineSeries={kpiData.stockoutDaysCurrent.sparkline}
              tooltip={kpiData.stockoutDaysCurrent.tooltip}
            />
            <KPICard
              title="Stockout Days (Simulated)"
              value={kpiData.stockoutDaysSimulated.value}
              delta7d={kpiData.stockoutDaysSimulated.delta7d}
              sparklineSeries={kpiData.stockoutDaysSimulated.sparkline}
              tooltip={kpiData.stockoutDaysSimulated.tooltip}
            />
            <KPICard
              title="Missed Throughput Value"
              value={kpiData.missedThroughputValue.value}
              delta7d={kpiData.missedThroughputValue.delta7d}
              sparklineSeries={kpiData.missedThroughputValue.sparkline}
              tooltip={kpiData.missedThroughputValue.tooltip}
            />

            {/* Row 3 (additional) */}
            <KPICard
              title="Overstock Days"
              value={kpiData.overstockDays.value}
              delta7d={kpiData.overstockDays.delta7d}
              sparklineSeries={kpiData.overstockDays.sparkline}
              tooltip={kpiData.overstockDays.tooltip}
            />
            <KPICard
              title="Redundant Inventory Value"
              value={kpiData.redundantInventoryValue.value}
              delta7d={kpiData.redundantInventoryValue.delta7d}
              sparklineSeries={kpiData.redundantInventoryValue.sparkline}
              tooltip={kpiData.redundantInventoryValue.tooltip}
            />
          </div>
        </div>
      </div>

      {/* Agent Prompt Dock */}
      <AgentPromptDock />
    </Layout>
  );
};

export default Dashboard;
