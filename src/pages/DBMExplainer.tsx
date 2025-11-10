import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, PauseCircle, RotateCcw } from "lucide-react";

export default function DBMExplainer() {
  const [animationDay, setAnimationDay] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [replenishmentMode, setReplenishmentMode] = useState<"weekly" | "daily">("weekly");

  // Weekly replenishment simulation: 7-day lead time, weekly ordering
  // Track demand separately to calculate lost sales from stockouts
  const weeklySimulationData = [
    // Week 1 - Starting with target buffer of 21
    { day: 0, sales: 0, demand: 0, receipt: 0, onHand: 21, economic: 21, target: 21, decision: "Initial state", zone: "green" },
    { day: 1, sales: 3, demand: 3, receipt: 0, onHand: 18, economic: 18, target: 21, decision: "Sales: 3 units", zone: "green" },
    { day: 2, sales: 2, demand: 2, receipt: 0, onHand: 16, economic: 16, target: 21, decision: "Sales: 2 units", zone: "yellow" },
    { day: 3, sales: 4, demand: 4, receipt: 0, onHand: 12, economic: 12, target: 21, decision: "Sales: 4 units", zone: "yellow" },
    { day: 4, sales: 3, demand: 3, receipt: 0, onHand: 9, economic: 9, target: 21, decision: "Sales: 3 units", zone: "red" },
    { day: 5, sales: 2, demand: 2, receipt: 0, onHand: 7, economic: 7, target: 21, decision: "Sales: 2 units", zone: "red" },
    { day: 6, sales: 3, demand: 3, receipt: 0, onHand: 4, economic: 4, target: 21, decision: "Sales: 3 units", zone: "red" },
    // Week 2 - Order arrives, but high sales continue
    { day: 7, sales: 4, demand: 4, receipt: 20, onHand: 20, economic: 20, target: 21, decision: "Receipt: 20 units, Sales: 4", zone: "yellow" },
    { day: 8, sales: 5, demand: 5, receipt: 0, onHand: 15, economic: 15, target: 21, decision: "Sales: 5 units", zone: "yellow" },
    { day: 9, sales: 3, demand: 3, receipt: 0, onHand: 12, economic: 12, target: 21, decision: "Sales: 3 units", zone: "yellow" },
    { day: 10, sales: 4, demand: 4, receipt: 0, onHand: 8, economic: 8, target: 21, decision: "Sales: 4 units", zone: "red" },
    { day: 11, sales: 3, demand: 3, receipt: 0, onHand: 5, economic: 5, target: 21, decision: "Sales: 3 units", zone: "red" },
    { day: 12, sales: 3, demand: 3, receipt: 0, onHand: 2, economic: 2, target: 21, decision: "Sales: 3 units", zone: "red" },
    { day: 13, sales: 0, demand: 2, receipt: 0, onHand: 0, economic: 0, target: 21, decision: "STOCKOUT - Lost 2 units", zone: "red" },
    // Week 3 - Buffer increases after 7 days in red. New target: 28
    { day: 14, sales: 0, demand: 3, receipt: 25, onHand: 25, economic: 25, target: 28, decision: "Receipt: 25, STOCKOUT - Lost 3 units", zone: "yellow" },
    { day: 15, sales: 4, demand: 4, receipt: 0, onHand: 21, economic: 21, target: 28, decision: "Sales: 4 units", zone: "yellow" },
    { day: 16, sales: 3, demand: 3, receipt: 0, onHand: 18, economic: 18, target: 28, decision: "Sales: 3 units", zone: "yellow" },
    { day: 17, sales: 2, demand: 2, receipt: 0, onHand: 16, economic: 16, target: 28, decision: "Sales: 2 units", zone: "yellow" },
    { day: 18, sales: 3, demand: 3, receipt: 0, onHand: 13, economic: 13, target: 28, decision: "Sales: 3 units", zone: "yellow" },
    { day: 19, sales: 4, demand: 4, receipt: 0, onHand: 9, economic: 9, target: 28, decision: "Sales: 4 units", zone: "red" },
    { day: 20, sales: 5, demand: 5, receipt: 0, onHand: 4, economic: 4, target: 28, decision: "Sales: 5 units", zone: "red" },
    // Week 4 - Receipt arrives
    { day: 21, sales: 4, demand: 4, receipt: 28, onHand: 28, economic: 28, target: 28, decision: "Receipt: 28, Sales: 4 - At target", zone: "green" },
    { day: 22, sales: 0, demand: 0, receipt: 0, onHand: 28, economic: 28, target: 28, decision: "No sales", zone: "green" },
    { day: 23, sales: 1, demand: 1, receipt: 0, onHand: 27, economic: 27, target: 28, decision: "Sales: 1 unit", zone: "green" },
    { day: 24, sales: 1, demand: 1, receipt: 0, onHand: 26, economic: 26, target: 28, decision: "Sales: 1 unit", zone: "green" },
    { day: 25, sales: 0, demand: 0, receipt: 0, onHand: 26, economic: 26, target: 28, decision: "No sales", zone: "green" },
    { day: 26, sales: 2, demand: 2, receipt: 0, onHand: 24, economic: 24, target: 28, decision: "Sales: 2 units", zone: "green" },
    { day: 27, sales: 1, demand: 1, receipt: 0, onHand: 23, economic: 23, target: 28, decision: "Sales: 1 unit", zone: "green" },
    // Week 5
    { day: 28, sales: 0, demand: 0, receipt: 0, onHand: 23, economic: 23, target: 28, decision: "No sales", zone: "green" },
    { day: 29, sales: 2, demand: 2, receipt: 0, onHand: 21, economic: 21, target: 28, decision: "Sales: 2 units", zone: "green" },
    { day: 30, sales: 1, demand: 1, receipt: 0, onHand: 20, economic: 20, target: 28, decision: "Sales: 1 unit", zone: "green" },
  ];

  // Daily replenishment simulation: same demand pattern but no stockouts
  const dailySimulationData = [
    { day: 0, sales: 0, demand: 0, receipt: 0, onHand: 10, economic: 10, target: 10, decision: "Initial state", zone: "green" },
    { day: 1, sales: 3, demand: 3, receipt: 3, onHand: 10, economic: 10, target: 10, decision: "Sales: 3, Receipt: 3", zone: "green" },
    { day: 2, sales: 2, demand: 2, receipt: 2, onHand: 10, economic: 10, target: 10, decision: "Sales: 2, Receipt: 2", zone: "green" },
    { day: 3, sales: 4, demand: 4, receipt: 4, onHand: 10, economic: 10, target: 10, decision: "Sales: 4, Receipt: 4", zone: "green" },
    { day: 4, sales: 3, demand: 3, receipt: 3, onHand: 10, economic: 10, target: 10, decision: "Sales: 3, Receipt: 3", zone: "green" },
    { day: 5, sales: 2, demand: 2, receipt: 2, onHand: 10, economic: 10, target: 10, decision: "Sales: 2, Receipt: 2", zone: "green" },
    { day: 6, sales: 3, demand: 3, receipt: 3, onHand: 10, economic: 10, target: 10, decision: "Sales: 3, Receipt: 3", zone: "green" },
    { day: 7, sales: 4, demand: 4, receipt: 4, onHand: 10, economic: 10, target: 10, decision: "Sales: 4, Receipt: 4", zone: "green" },
    { day: 8, sales: 5, demand: 5, receipt: 5, onHand: 10, economic: 10, target: 10, decision: "Sales: 5, Receipt: 5", zone: "green" },
    { day: 9, sales: 3, demand: 3, receipt: 3, onHand: 10, economic: 10, target: 10, decision: "Sales: 3, Receipt: 3", zone: "green" },
    { day: 10, sales: 4, demand: 4, receipt: 4, onHand: 10, economic: 10, target: 10, decision: "Sales: 4, Receipt: 4", zone: "green" },
    { day: 11, sales: 3, demand: 3, receipt: 3, onHand: 10, economic: 10, target: 10, decision: "Sales: 3, Receipt: 3", zone: "green" },
    { day: 12, sales: 3, demand: 3, receipt: 3, onHand: 10, economic: 10, target: 10, decision: "Sales: 3, Receipt: 3", zone: "green" },
    { day: 13, sales: 2, demand: 2, receipt: 2, onHand: 10, economic: 10, target: 10, decision: "Sales: 2, Receipt: 2", zone: "green" },
    { day: 14, sales: 3, demand: 3, receipt: 3, onHand: 10, economic: 10, target: 10, decision: "Sales: 3, Receipt: 3", zone: "green" },
    { day: 15, sales: 4, demand: 4, receipt: 4, onHand: 10, economic: 10, target: 10, decision: "Sales: 4, Receipt: 4", zone: "green" },
    { day: 16, sales: 3, demand: 3, receipt: 3, onHand: 10, economic: 10, target: 10, decision: "Sales: 3, Receipt: 3", zone: "green" },
    { day: 17, sales: 2, demand: 2, receipt: 2, onHand: 10, economic: 10, target: 10, decision: "Sales: 2, Receipt: 2", zone: "green" },
    { day: 18, sales: 3, demand: 3, receipt: 3, onHand: 10, economic: 10, target: 10, decision: "Sales: 3, Receipt: 3", zone: "green" },
    { day: 19, sales: 4, demand: 4, receipt: 4, onHand: 10, economic: 10, target: 10, decision: "Sales: 4, Receipt: 4", zone: "green" },
    { day: 20, sales: 5, demand: 5, receipt: 5, onHand: 10, economic: 10, target: 10, decision: "Sales: 5, Receipt: 5", zone: "green" },
    { day: 21, sales: 4, demand: 4, receipt: 4, onHand: 10, economic: 10, target: 10, decision: "Sales: 4, Receipt: 4", zone: "green" },
    { day: 22, sales: 0, demand: 0, receipt: 0, onHand: 10, economic: 10, target: 10, decision: "No activity", zone: "green" },
    { day: 23, sales: 1, demand: 1, receipt: 1, onHand: 10, economic: 10, target: 10, decision: "Sales: 1, Receipt: 1", zone: "green" },
    { day: 24, sales: 1, demand: 1, receipt: 1, onHand: 10, economic: 10, target: 10, decision: "Sales: 1, Receipt: 1", zone: "green" },
    { day: 25, sales: 0, demand: 0, receipt: 0, onHand: 10, economic: 10, target: 10, decision: "No activity", zone: "green" },
    { day: 26, sales: 2, demand: 2, receipt: 2, onHand: 10, economic: 10, target: 10, decision: "Sales: 2, Receipt: 2", zone: "green" },
    { day: 27, sales: 1, demand: 1, receipt: 1, onHand: 10, economic: 10, target: 10, decision: "Sales: 1, Receipt: 1", zone: "green" },
    { day: 28, sales: 0, demand: 0, receipt: 0, onHand: 10, economic: 10, target: 10, decision: "No activity", zone: "green" },
    { day: 29, sales: 2, demand: 2, receipt: 2, onHand: 10, economic: 10, target: 10, decision: "Sales: 2, Receipt: 2", zone: "green" },
    { day: 30, sales: 1, demand: 1, receipt: 1, onHand: 10, economic: 10, target: 10, decision: "Sales: 1, Receipt: 1", zone: "green" },
  ];

  const simulationData = replenishmentMode === "weekly" ? weeklySimulationData : dailySimulationData;

  // Calculate metrics for comparison
  const calculateMetrics = (data: typeof weeklySimulationData) => {
    const totalSales = data.reduce((sum, d) => sum + d.sales, 0);
    const totalDemand = data.reduce((sum, d) => sum + d.demand, 0);
    const avgInventory = data.reduce((sum, d) => sum + d.onHand, 0) / data.length;
    const stockoutDays = data.filter(d => d.onHand === 0 && d.demand > 0).length;
    const daysInStock = data.length - stockoutDays;
    const availability = stockoutDays > 0 ? daysInStock / data.length : 1;
    const potentialSales = availability > 0 ? totalDemand : totalSales;
    const daysToCash = totalSales > 0 ? (avgInventory / (totalSales / data.length)) : 0;
    
    return { 
      totalSales, 
      totalDemand,
      potentialSales,
      avgInventory, 
      stockoutDays, 
      availability,
      daysToCash
    };
  };

  const weeklyMetrics = calculateMetrics(weeklySimulationData);
  const dailyMetrics = calculateMetrics(dailySimulationData);
  
  // Calculate indices and ROI improvement
  const salesIndex = {
    weekly: 100,
    daily: (dailyMetrics.potentialSales / weeklyMetrics.potentialSales) * 100
  };
  const inventoryIndex = {
    weekly: 100,
    daily: (dailyMetrics.avgInventory / weeklyMetrics.avgInventory) * 100
  };
  const roiDelta = {
    weekly: salesIndex.weekly / inventoryIndex.weekly,
    daily: salesIndex.daily / inventoryIndex.daily
  };
  const roiImprovement = ((roiDelta.daily - roiDelta.weekly) / roiDelta.weekly) * 100;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && animationDay < simulationData.length - 1) {
      interval = setInterval(() => {
        setAnimationDay(prev => {
          if (prev >= simulationData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, animationDay]);

  const currentState = simulationData[animationDay];
  const yellow = Math.floor((currentState.target / 3) * 2);
  const red = Math.floor(currentState.target / 3);

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case "red": return "bg-red-500/20 border-red-500";
      case "yellow": return "bg-yellow-500/20 border-yellow-500";
      case "green": return "bg-green-500/20 border-green-500";
      case "overstock": return "bg-blue-500/20 border-blue-500";
      default: return "bg-muted";
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-12 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Dynamic Buffer Management (DBM)</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Understanding how intelligent inventory buffers automatically adapt to demand variability
          </p>
        </div>

        {/* Core Principles */}
        <Card>
          <CardHeader>
            <CardTitle>What is DBM?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Dynamic Buffer Management is a sophisticated inventory control methodology that automatically adjusts inventory targets (buffers) 
              based on actual consumption patterns and lead times. Unlike traditional min-max systems, DBM uses <strong>only a maximum value</strong> 
              (the "green" zone) without a minimum, as replenishment decisions are calculated daily.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Key Principles</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Economic Stock Base:</strong> Buffers are set based on economic inventory levels (on-hand + on-order + in-transit)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Daily Calculation:</strong> Orders are calculated daily, eliminating the need for a traditional "min" reorder point</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Lead Time Driven:</strong> All buffer adjustments are governed by actual lead times to prevent over-reactions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Zone-Based Logic:</strong> Inventory position determines which zone you're in and triggers appropriate responses</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Why DBM?</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Reduces stockouts without excessive inventory</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Automatically adapts to demand changes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Prevents manual buffer adjustments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Optimizes working capital efficiency</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zone System */}
        <Card>
          <CardHeader>
            <CardTitle>The Four Zone System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              DBM divides inventory into four distinct zones, each triggering different management actions:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border-2 ${getZoneColor("overstock")}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-500">Overstock</Badge>
                  <span className="text-sm font-mono">On-hand &gt; Green</span>
                </div>
                <p className="text-sm">
                  Inventory exceeds target. System counts consecutive days in overstock. After lead time worth of days, 
                  buffer decreases by 1/3 of the distance between green and safety level.
                </p>
              </div>

              <div className={`p-4 rounded-lg border-2 ${getZoneColor("green")}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500">Green Zone</Badge>
                  <span className="text-sm font-mono">Yellow &lt; On-hand ≤ Green</span>
                </div>
                <p className="text-sm">
                  Safe zone. Target inventory level where you have adequate stock. Green zone represents 2/3 of the buffer. 
                  Consecutive days here can also trigger buffer decreases.
                </p>
              </div>

              <div className={`p-4 rounded-lg border-2 ${getZoneColor("yellow")}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-yellow-500">Yellow Zone</Badge>
                  <span className="text-sm font-mono">Red &lt; On-hand ≤ Yellow</span>
                </div>
                <p className="text-sm">
                  Warning zone. You're using buffer faster than expected. Yellow represents the middle third (between 1/3 and 2/3 of green). 
                  Not critical yet, but requires attention.
                </p>
              </div>

              <div className={`p-4 rounded-lg border-2 ${getZoneColor("red")}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-red-500">Red Zone</Badge>
                  <span className="text-sm font-mono">On-hand ≤ Red</span>
                </div>
                <p className="text-sm">
                  Critical zone. Buffer is too small. Red zone is the lowest third (1/3 of green). After lead time consecutive days here, 
                  buffer increases by 1/3 of the distance between green and safety level.
                </p>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Zone Calculation Formula</h4>
              <div className="space-y-1 text-sm font-mono">
                <div>Red = ⌊Green ÷ 3⌋</div>
                <div>Yellow = ⌊(Green ÷ 3) × 2⌋</div>
                <div>Green = Target Buffer (dynamically adjusted)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buffer Adjustment Logic */}
        <Card>
          <CardHeader>
            <CardTitle>Buffer Adjustment Triggers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="border-l-4 border-red-500 pl-4">
                <h4 className="font-semibold text-lg mb-2">Increase from Red Zone</h4>
                <p className="text-sm mb-2">Buffer is too small - demand exceeded expectations</p>
                <div className="space-y-1 text-sm">
                  <div><strong>Trigger:</strong> Consecutive days in red &gt; Lead Time</div>
                  <div><strong>Action:</strong> New Buffer = Green + ⌈(Green - Safety Level) ÷ 3⌉</div>
                  <div><strong>Wait Period:</strong> Must be out of red for &lt; Lead Time days</div>
                  <div className="text-muted-foreground">This prevents the buffer from being too conservative</div>
                </div>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-lg mb-2">Decrease from Green/Overstock</h4>
                <p className="text-sm mb-2">Buffer is too large - consistently oversupplied</p>
                <div className="space-y-1 text-sm">
                  <div><strong>Trigger:</strong> Consecutive days in green/overstock &gt; Lead Time</div>
                  <div><strong>Action:</strong> New Buffer = Green - ⌈(Green - Safety Level) ÷ 3⌉</div>
                  <div><strong>Wait Periods:</strong> Must be out of overstock &lt; Lead Time days AND last decrease &gt; Lead Time days ago</div>
                  <div className="text-muted-foreground">This frees up working capital while maintaining service levels</div>
                </div>
              </div>

            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">🔒 Safety Mechanisms</h4>
              <ul className="text-sm space-y-1">
                <li>• <strong>Minimum Target:</strong> Buffer never drops below 1 unit</li>
                <li>• <strong>Safety Level Protection:</strong> Buffer adjustments respect configured safety stock levels</li>
                <li>• <strong>Lead Time Governed:</strong> All changes require consecutive days = lead time to prevent over-reaction</li>
                <li>• <strong>Manual Override Protection:</strong> 3-day freeze after manual changes</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Economic Stock & Value Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Economic Stock & Value Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold">Economic Units Calculation</h4>
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <div className="font-mono">
                    <strong>Economic Units</strong> = On-Hand + On-Order + In-Transit
                  </div>
                  <p className="text-muted-foreground">
                    Total inventory commitment including pending orders. This is your true inventory position.
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <div className="font-mono">
                    <strong>Overstock Units</strong> = max(0, Economic - Green)
                  </div>
                  <p className="text-muted-foreground">
                    Excess inventory beyond target buffer. Represents tied-up working capital.
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <div className="font-mono">
                    <strong>Understock Units</strong> = max(0, Green - Economic)
                  </div>
                  <p className="text-muted-foreground">
                    Gap to reach target buffer. Indicates potential replenishment need.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Value Metrics</h4>
                
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 p-4 rounded-lg">
                  <h5 className="font-semibold mb-2">MTV (Missed Throughput Value)</h5>
                  <div className="text-sm space-y-2">
                    <div className="font-mono">MTV = Unit Sales × Service Level % × Cash Margin</div>
                    <p className="text-muted-foreground">
                      The cost of missed sales opportunities. Calculated as unit sales multiplied by the service level 
                      (availability percentage) for the time window, multiplied by the cash margin on sales excluding VAT. 
                      This metric quantifies the revenue impact of stockouts.
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 p-4 rounded-lg">
                  <h5 className="font-semibold mb-2">RIV (Redundant Inventory Value)</h5>
                  <div className="text-sm space-y-2">
                    <div className="font-mono">RIV = COGS × Overstocked Units</div>
                    <p className="text-muted-foreground">
                      The cost of goods (cash) invested in redundant (overstocked) inventory on the last day of a date range. 
                      This represents tied-up working capital that could be deployed elsewhere in the business.
                    </p>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-sm">
                  <strong>Note:</strong> Unlike traditional min-max systems with static reorder points, DBM calculates 
                  replenishment needs <strong>daily</strong>, making the "min" obsolete. The Green target acts as the 
                  only reference point needed.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Animation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>DBM in Action: 30-Day Simulation</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <PauseCircle className="w-4 h-4 mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAnimationDay(0);
                    setIsPlaying(false);
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mode Toggle */}
            <div className="flex gap-2 justify-center">
              <Button
                variant={replenishmentMode === "weekly" ? "default" : "outline"}
                onClick={() => {
                  setReplenishmentMode("weekly");
                  setAnimationDay(0);
                  setIsPlaying(false);
                }}
              >
                Weekly Replenishment
              </Button>
              <Button
                variant={replenishmentMode === "daily" ? "default" : "outline"}
                onClick={() => {
                  setReplenishmentMode("daily");
                  setAnimationDay(0);
                  setIsPlaying(false);
                }}
              >
                Daily Replenishment
              </Button>
            </div>

            {replenishmentMode === "daily" && (
              <div className="bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-primary/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">ROI Comparison: Weekly vs Daily Replenishment</h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="bg-background/50 p-3 rounded-lg">
                    <div className="text-muted-foreground mb-1">Availability & Sales</div>
                    <div className="text-sm">
                      <div className="mb-2">
                        <span className="font-semibold">Weekly:</span> {(weeklyMetrics.availability * 100).toFixed(1)}% ({weeklyMetrics.stockoutDays} stockout days)
                      </div>
                      <div className="mb-2">
                        <span className="font-semibold">Daily:</span> 100% (0 stockouts)
                      </div>
                    </div>
                    <div className="border-t border-border/50 pt-2 mt-2">
                      <div>Weekly: {weeklyMetrics.totalSales} units sold</div>
                      <div className="text-primary font-bold">Daily: {dailyMetrics.totalSales} units sold</div>
                      <div className="text-xs mt-1 text-green-500">+{((dailyMetrics.totalSales - weeklyMetrics.totalSales) / weeklyMetrics.totalSales * 100).toFixed(1)}% more sales</div>
                    </div>
                  </div>
                  <div className="bg-background/50 p-3 rounded-lg">
                    <div className="text-muted-foreground mb-1">Avg Inventory</div>
                    <div className="text-lg font-bold mb-1">Weekly: {weeklyMetrics.avgInventory.toFixed(1)} units</div>
                    <div className="text-lg font-bold text-primary mb-2">Daily: {dailyMetrics.avgInventory.toFixed(1)} units</div>
                    <div className="text-xs text-green-500 font-semibold">
                      {((1 - dailyMetrics.avgInventory / weeklyMetrics.avgInventory) * 100).toFixed(1)}% less inventory
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Inventory Index: {inventoryIndex.daily.toFixed(1)}</div>
                  </div>
                  <div className="bg-background/50 p-3 rounded-lg">
                    <div className="text-muted-foreground mb-1">Days to Cash</div>
                    <div className="text-lg font-bold mb-1">Weekly: {weeklyMetrics.daysToCash.toFixed(1)} days</div>
                    <div className="text-lg font-bold text-primary mb-2">Daily: {dailyMetrics.daysToCash.toFixed(1)} days</div>
                    <div className="text-xs text-green-500 font-semibold">
                      {((weeklyMetrics.daysToCash - dailyMetrics.daysToCash) / weeklyMetrics.daysToCash * 100).toFixed(1)}% faster cash conversion
                    </div>
                  </div>
                  <div className="bg-background/50 p-3 rounded-lg">
                    <div className="text-muted-foreground mb-1">ROI Improvement</div>
                    <div className="text-lg font-bold mb-1">Weekly: {roiDelta.weekly.toFixed(2)}</div>
                    <div className="text-lg font-bold text-primary mb-2">Daily: {roiDelta.daily.toFixed(2)}</div>
                    <div className="text-xs text-green-500 font-semibold">
                      +{roiImprovement.toFixed(1)}% profit improvement
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Sales ↑{salesIndex.daily.toFixed(0)}% / Inv ↓{(100 - inventoryIndex.daily).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-sm">
              <strong>Simulation Parameters:</strong> 7-day lead time • {replenishmentMode === "weekly" ? "Weekly ordering • Variable sales (15+ sales days) • 2 stockouts • Buffer increase on day 14 • Buffer decrease on day 28" : "Daily ordering • Same sales pattern • No stockouts • Stable inventory"}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Day {currentState.day} of {simulationData.length - 1}</span>
                <Badge className={getZoneColor(currentState.zone)}>
                  {currentState.zone.toUpperCase()}
                </Badge>
              </div>
              <input
                type="range"
                min="0"
                max={simulationData.length - 1}
                value={animationDay}
                onChange={(e) => setAnimationDay(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Current State Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-xs text-muted-foreground">On Hand</div>
                <div className="text-2xl font-bold">{currentState.onHand.toFixed(0)}</div>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-xs text-muted-foreground">Target Buffer</div>
                <div className="text-2xl font-bold text-green-500">{currentState.target}</div>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-xs text-muted-foreground">Economic Units</div>
                <div className="text-2xl font-bold text-amber-500">{currentState.economic.toFixed(0)}</div>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-xs text-muted-foreground">Day Sales</div>
                <div className="text-2xl font-bold text-orange-500">{currentState.sales}</div>
              </div>
            </div>

            {/* Decision */}
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
              <div className="text-sm font-semibold mb-1">📊 Decision:</div>
              <div className="text-sm">{currentState.decision}</div>
            </div>

            {/* Visual Chart Area with Colored Zones */}
            <div className="border rounded-lg p-6 bg-card">
              <div className="relative h-96">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-muted-foreground">
                  <span>30</span>
                  <span>25</span>
                  <span>20</span>
                  <span>15</span>
                  <span>10</span>
                  <span>5</span>
                  <span>0</span>
                </div>

                {/* Chart container */}
                <div className="ml-14 h-full relative border-l border-b border-border">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-dashed border-border/30"
                      style={{ bottom: `${(i / 6) * 100}%` }}
                    />
                  ))}

                  {/* Day markers on X-axis */}
                  <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-muted-foreground px-1">
                    <span>0</span>
                    <span>5</span>
                    <span>10</span>
                    <span>15</span>
                    <span>20</span>
                    <span>25</span>
                    <span>30</span>
                  </div>

                  {/* Colored zone backgrounds - drawn dynamically per day (only for weekly mode) */}
                  {replenishmentMode === "weekly" && simulationData.slice(0, animationDay + 1).map((point, idx) => {
                    const xPos = (idx / 30) * 100;
                    const width = (1 / 30) * 100;
                    const target = point.target;
                    const yellow = Math.floor((target / 3) * 2);
                    const red = Math.floor(target / 3);

                    return (
                      <div key={`zones-${idx}`} className="absolute inset-0 pointer-events-none">
                        {/* Overstock zone - above target */}
                        <div
                          className="absolute bg-blue-500/10"
                          style={{
                            left: `${xPos}%`,
                            width: `${width}%`,
                            bottom: `${(target / 30) * 100}%`,
                            height: `${((30 - target) / 30) * 100}%`,
                          }}
                        />
                        {/* Green zone */}
                        <div
                          className="absolute bg-green-500/10"
                          style={{
                            left: `${xPos}%`,
                            width: `${width}%`,
                            bottom: `${(yellow / 30) * 100}%`,
                            height: `${((target - yellow) / 30) * 100}%`,
                          }}
                        />
                        {/* Yellow zone */}
                        <div
                          className="absolute bg-yellow-500/10"
                          style={{
                            left: `${xPos}%`,
                            width: `${width}%`,
                            bottom: `${(red / 30) * 100}%`,
                            height: `${((yellow - red) / 30) * 100}%`,
                          }}
                        />
                        {/* Red zone */}
                        <div
                          className="absolute bg-red-500/10"
                          style={{
                            left: `${xPos}%`,
                            width: `${width}%`,
                            bottom: 0,
                            height: `${(red / 30) * 100}%`,
                          }}
                        />
                      </div>
                    );
                  })}

                  {/* Target (Green) buffer line - dashed green */}
                  {simulationData.slice(0, animationDay + 1).map((point, idx) => {
                    if (idx === 0) return null;
                    const prev = simulationData[idx - 1];
                    const x1 = ((idx - 1) / 30) * 100;
                    const x2 = (idx / 30) * 100;
                    const y1 = (prev.target / 30) * 100;
                    const y2 = (point.target / 30) * 100;

                    return (
                      <svg
                        key={`target-${idx}`}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ overflow: 'visible' }}
                      >
                        <line
                          x1={`${x1}%`}
                          y1={`${100 - y1}%`}
                          x2={`${x2}%`}
                          y2={`${100 - y2}%`}
                          stroke="rgb(34, 197, 94)"
                          strokeWidth="2"
                          strokeDasharray="5 5"
                          opacity="0.8"
                        />
                      </svg>
                    );
                  })}

                  {/* On Hand line - BLACK step function (only changes with sales/receipts) */}
                  {simulationData.slice(0, animationDay + 1).map((point, idx) => {
                    if (idx === 0) return null;
                    const prev = simulationData[idx - 1];
                    const x1 = ((idx - 1) / 30) * 100;
                    const x2 = (idx / 30) * 100;
                    const y1 = (prev.onHand / 30) * 100;
                    const y2 = (point.onHand / 30) * 100;

                    return (
                      <svg
                        key={`onhand-${idx}`}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ overflow: 'visible' }}
                      >
                        {/* Horizontal line - inventory stays constant */}
                        <line
                          x1={`${x1}%`}
                          y1={`${100 - y1}%`}
                          x2={`${x2}%`}
                          y2={`${100 - y1}%`}
                          stroke="rgb(0, 0, 0)"
                          strokeWidth="3"
                        />
                        {/* Vertical line - inventory changes (sale or receipt) */}
                        <line
                          x1={`${x2}%`}
                          y1={`${100 - y1}%`}
                          x2={`${x2}%`}
                          y2={`${100 - y2}%`}
                          stroke="rgb(0, 0, 0)"
                          strokeWidth="3"
                        />
                      </svg>
                    );
                  })}

                  {/* Sales bars at the bottom - orange bars showing when sales occurred */}
                  {simulationData.slice(0, animationDay + 1).map((point, idx) => {
                    if (point.sales === 0) return null;
                    const x = (idx / 30) * 100;
                    const barHeight = (point.sales / 5) * 15; // Scale sales to max 15% of chart height

                    return (
                      <div
                        key={`sales-${idx}`}
                        className="absolute bg-orange-500/60 border-l-2 border-orange-600"
                        style={{
                          left: `${x}%`,
                          width: `${100 / 30}%`,
                          bottom: 0,
                          height: `${barHeight}%`,
                        }}
                      />
                    );
                  })}

                  {/* Stockout indicators */}
                  {simulationData.slice(0, animationDay + 1).map((point, idx) => {
                    if (point.onHand > 0) return null;
                    const x = (idx / 30) * 100;

                    return (
                      <div
                        key={`stockout-${idx}`}
                        className="absolute bottom-0 flex items-center justify-center"
                        style={{
                          left: `${x}%`,
                          transform: 'translateX(-50%)',
                        }}
                      >
                        <div className="text-2xl">⚠️</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-black" style={{ height: '3px' }} />
                  <span>On Hand Inventory (Black)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="24" height="12" className="opacity-80">
                    <line x1="0" y1="6" x2="24" y2="6" stroke="rgb(34, 197, 94)" strokeWidth="2" strokeDasharray="5 5" />
                  </svg>
                  <span>Target Buffer (Green)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500" />
                  <span>Sales</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <span>Stockout</span>
                </div>
              </div>
            </div>

            {/* Show detailed table */}
            <Button
              variant="outline"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full"
            >
              {showDetails ? "Hide" : "Show"} Detailed Data Table
            </Button>

            {showDetails && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 border">Day</th>
                      <th className="p-2 border">Sales</th>
                      <th className="p-2 border">Receipt</th>
                      <th className="p-2 border">On Hand</th>
                      <th className="p-2 border">Target</th>
                      <th className="p-2 border">Economic</th>
                      <th className="p-2 border">Zone</th>
                      <th className="p-2 border">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulationData.slice(0, animationDay + 1).map((data) => (
                      <tr key={data.day} className={data.day === animationDay ? "bg-primary/10 font-semibold" : ""}>
                        <td className="p-2 border text-center">{data.day}</td>
                        <td className="p-2 border text-center">{data.sales}</td>
                        <td className="p-2 border text-center">{data.receipt}</td>
                        <td className="p-2 border text-center font-mono">{data.onHand}</td>
                        <td className="p-2 border text-center font-mono">{data.target}</td>
                        <td className="p-2 border text-center font-mono">{data.economic}</td>
                        <td className="p-2 border text-center">
                          <Badge className={getZoneColor(data.zone)}>{data.zone}</Badge>
                        </td>
                        <td className="p-2 border text-sm">{data.decision}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader>
            <CardTitle>Why DBM Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <strong>Self-Correcting:</strong> The zone-based logic ensures buffers automatically adjust to actual consumption, 
              not forecasts. If you're consistently in red, buffers increase. If consistently in green/overstock, they decrease.
            </p>
            <p>
              <strong>Lead Time Protection:</strong> All adjustments require consecutive days equal to lead time, preventing 
              over-reaction to short-term fluctuations while responding quickly to genuine pattern changes.
            </p>
            <p>
              <strong>Capital Efficient:</strong> By automatically reducing buffers when demand decreases, DBM frees up working 
              capital that can be deployed elsewhere, while the accelerator mechanisms ensure rapid response to demand spikes.
            </p>
            <p>
              <strong>No Forecasting Required:</strong> Unlike traditional methods that rely on demand forecasting, DBM reacts 
              to actual consumption. This makes it particularly effective in volatile or unpredictable demand environments.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
