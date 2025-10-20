// Mock data for KPIs and filters

export const locations = ["All Locations", "Store A", "Store B", "Store C", "DC North"];

export const products = [
  "All Products",
  "Product Alpha",
  "Product Beta",
  "Product Gamma",
  "Product Delta",
];

// Summary metrics
export const summaryMetrics = {
  locations: 4,
  skus: 523,
  days: 21,
  skuLocDays: 43932,
  serviceLevel: 87.3,
  serviceLevelSimulated: 94.8,
};

// Generate 21-day sparkline data
const generateSparkline = (baseValue: number, variance: number) => {
  return Array.from({ length: 21 }, (_, i) => ({
    value: baseValue + Math.random() * variance - variance / 2,
  }));
};

export const kpiData = {
  throughputCashMargin: {
    value: "€847K",
    delta7d: 5.2,
    sparkline: generateSparkline(850, 100),
    tooltip: "Rolling 21-day total cash margin from throughput sales",
  },
  turnsCurrent: {
    value: 12.4,
    delta7d: -2.1,
    sparkline: generateSparkline(12.4, 1.5),
    tooltip: "Current inventory turns (annual rate)",
  },
  turnsSimulated: {
    value: 15.8,
    delta7d: 3.4,
    sparkline: generateSparkline(15.8, 2),
    tooltip: "Projected turns after DBM optimization",
  },
  stockoutDaysCurrent: {
    value: 23,
    delta7d: -8.5,
    sparkline: generateSparkline(23, 5),
    tooltip: "Total stockout days across all SKUs (21-day window)",
  },
  stockoutDaysSimulated: {
    value: 11,
    delta7d: -15.2,
    sparkline: generateSparkline(11, 3),
    tooltip: "Projected stockout days after buffer optimization",
  },
  missedThroughputValue: {
    value: "€142K",
    delta7d: -12.3,
    sparkline: generateSparkline(142, 20),
    tooltip: "Estimated revenue lost due to stockouts",
  },
  missedThroughputValueSimulated: {
    value: "€58K",
    delta7d: -28.4,
    sparkline: generateSparkline(58, 12),
    tooltip: "Projected revenue loss after buffer optimization",
  },
  redundantInventoryValue: {
    value: "€284K",
    delta7d: 6.1,
    sparkline: generateSparkline(284, 40),
    tooltip: "Value of inventory beyond optimal buffer levels",
  },
  redundantInventoryValueSimulated: {
    value: "€112K",
    delta7d: -18.7,
    sparkline: generateSparkline(112, 25),
    tooltip: "Projected redundant inventory after optimization",
  },
};

// Graph data for inventory flow visualization
export const inventoryFlowData = Array.from({ length: 21 }, (_, i) => ({
  day: i + 1,
  sales: 45 + Math.random() * 20 - 10,
  inventory: 180 + Math.random() * 60 - 30 - i * 2,
  inventorySimulated: 140 + Math.random() * 40 - 20 - i * 1.5,
}));
