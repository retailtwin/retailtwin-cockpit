import { useState } from "react";
import { Layout } from "@/components/Layout";
import { FilterBar } from "@/components/FilterBar";
import { NotificationBanner } from "@/components/NotificationBanner";
import { AgentPromptDock } from "@/components/AgentPromptDock";
import { KPICard } from "@/components/KPICard";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { locations, products } from "@/lib/mockData";

// Mock data for KPI cards
const generateSparkline = (baseValue: number, variance: number = 5) => {
  return Array.from({ length: 30 }, () => ({
    value: baseValue + (Math.random() - 0.5) * variance,
  }));
};

const kpiCardsData = [
  {
    title: "Throughput Cash Margin",
    value: "€745K",
    delta7d: 3.2,
    sparklineSeries: generateSparkline(745, 50),
    tooltip: "Revenue minus truly variable costs (21-day rolling average)",
  },
  {
    title: "Turns (Current)",
    value: 4.2,
    delta7d: -1.5,
    sparklineSeries: generateSparkline(4.2, 0.3),
    tooltip: "Current inventory turnover rate (21-day rolling average)",
  },
  {
    title: "Turns (Simulated)",
    value: 6.8,
    delta7d: 2.1,
    sparklineSeries: generateSparkline(6.8, 0.4),
    tooltip: "Simulated inventory turnover with optimized buffers (21-day rolling average)",
  },
  {
    title: "Stockout Days (Current)",
    value: 12,
    delta7d: -8.3,
    sparklineSeries: generateSparkline(12, 2),
    tooltip: "Days with stockouts in current period (21-day rolling average)",
    unit: "days",
  },
  {
    title: "Stockout Days (Simulated)",
    value: 3,
    delta7d: -15.2,
    sparklineSeries: generateSparkline(3, 1),
    tooltip: "Projected stockout days with optimized buffers (21-day rolling average)",
    unit: "days",
  },
  {
    title: "Missed Throughput Value (MTV)",
    value: "€142K",
    delta7d: -4.8,
    sparklineSeries: generateSparkline(142, 15),
    tooltip: "Lost revenue due to stockouts (21-day rolling average)",
  },
];

const Dashboard = () => {
  const [selectedLocation, setSelectedLocation] = useState(locations[0]);
  const [selectedProduct, setSelectedProduct] = useState(products[0]);
  const [agentDockOpen, setAgentDockOpen] = useState(false);

  const handleExportCSV = () => {
    // Placeholder for CSV export functionality
    console.log("Export CSV clicked");
  };

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

          {/* KPI Cards Grid - 2x3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpiCardsData.map((kpi, index) => (
              <KPICard key={index} {...kpi} />
            ))}
          </div>
        </div>
      </div>

      {/* Agent Prompt Dock */}
      {agentDockOpen && <AgentPromptDock onClose={() => setAgentDockOpen(false)} />}
    </Layout>
  );
};

export default Dashboard;
