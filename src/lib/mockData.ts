// Mock data for KPIs and filters

export const locations = ["All Locations", "Store A", "Store B", "Store C", "DC North"];

export const products = [
  "All Products",
  "Product Alpha",
  "Product Beta",
  "Product Gamma",
  "Product Delta",
];

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
  overstockDays: {
    value: 87,
    delta7d: 4.2,
    sparkline: generateSparkline(87, 15),
    tooltip: "Days of excess inventory beyond buffer targets",
  },
  redundantInventoryValue: {
    value: "€284K",
    delta7d: 6.1,
    sparkline: generateSparkline(284, 40),
    tooltip: "Value of inventory beyond optimal buffer levels",
  },
};
