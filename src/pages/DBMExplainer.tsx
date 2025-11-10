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

  // Simulation data showing DBM sawtooth pattern with realistic lead-time variance
  const leadTime = 16; // days
  const simulationData = [
    { day: 0, sales: 0, receipt: 0, onHand: 9, economic: 9, target: 6, decision: "Initial state", zone: "green" },
    { day: 1, sales: 0.5, receipt: 0, onHand: 8.5, economic: 8.5, target: 6, decision: "Normal consumption", zone: "green" },
    { day: 2, sales: 0.5, receipt: 0, onHand: 8, economic: 8, target: 6, decision: "Normal consumption", zone: "green" },
    { day: 3, sales: 0.5, receipt: 0, onHand: 7.5, economic: 7.5, target: 6, decision: "Normal consumption", zone: "green" },
    { day: 4, sales: 0.5, receipt: 0, onHand: 7, economic: 7, target: 6, decision: "Normal consumption", zone: "green" },
    { day: 5, sales: 0.5, receipt: 0, onHand: 6.5, economic: 6.5, target: 6, decision: "Normal consumption", zone: "green" },
    { day: 6, sales: 0.5, receipt: 0, onHand: 6, economic: 6, target: 6, decision: "At target", zone: "yellow" },
    { day: 7, sales: 0.5, receipt: 0, onHand: 5.5, economic: 5.5, target: 6, decision: "Below target", zone: "yellow" },
    { day: 8, sales: 0.5, receipt: 0, onHand: 5, economic: 5, target: 6, decision: "Below target", zone: "yellow" },
    { day: 9, sales: 0.5, receipt: 0, onHand: 4.5, economic: 4.5, target: 6, decision: "Below target", zone: "yellow" },
    { day: 10, sales: 0.5, receipt: 0, onHand: 4, economic: 4, target: 6, decision: "Below target", zone: "red" },
    { day: 11, sales: 0.5, receipt: 0, onHand: 3.5, economic: 3.5, target: 6, decision: "Below target", zone: "red" },
    { day: 12, sales: 0.5, receipt: 0, onHand: 3, economic: 3, target: 6, decision: "Below target", zone: "red" },
    { day: 13, sales: 0.5, receipt: 0, onHand: 2.5, economic: 2.5, target: 6, decision: "Below target", zone: "red" },
    { day: 14, sales: 0.5, receipt: 0, onHand: 2, economic: 2, target: 6, decision: "Below target", zone: "red" },
    { day: 15, sales: 0.5, receipt: 0, onHand: 1.5, economic: 1.5, target: 6, decision: "Critical low", zone: "red" },
    { day: 16, sales: 0.5, receipt: 9, onHand: 10, economic: 10, target: 6, decision: "Receipt +9", zone: "overstock" },
    { day: 17, sales: 0.5, receipt: 0, onHand: 9.5, economic: 9.5, target: 6, decision: "Above target", zone: "overstock" },
    { day: 18, sales: 0.5, receipt: 0, onHand: 9, economic: 9, target: 6, decision: "Above target", zone: "green" },
    { day: 19, sales: 0.5, receipt: 0, onHand: 8.5, economic: 8.5, target: 6, decision: "Normal", zone: "green" },
    { day: 20, sales: 0.5, receipt: 0, onHand: 8, economic: 8, target: 6, decision: "Normal", zone: "green" },
    { day: 21, sales: 0.5, receipt: 0, onHand: 7.5, economic: 7.5, target: 6, decision: "Normal", zone: "green" },
    { day: 22, sales: 0.5, receipt: 0, onHand: 7, economic: 7, target: 6, decision: "Normal", zone: "green" },
    { day: 23, sales: 0.5, receipt: 0, onHand: 6.5, economic: 6.5, target: 6, decision: "Normal", zone: "green" },
    { day: 24, sales: 0.5, receipt: 0, onHand: 6, economic: 6, target: 6, decision: "At target", zone: "yellow" },
    { day: 25, sales: 0.5, receipt: 0, onHand: 5.5, economic: 5.5, target: 6, decision: "Below target", zone: "yellow" },
    { day: 26, sales: 0.5, receipt: 0, onHand: 5, economic: 5, target: 6, decision: "Below target", zone: "yellow" },
    { day: 27, sales: 0.5, receipt: 0, onHand: 4.5, economic: 4.5, target: 6, decision: "Below target", zone: "yellow" },
    { day: 28, sales: 0.5, receipt: 0, onHand: 4, economic: 4, target: 6, decision: "Below target", zone: "red" },
    { day: 29, sales: 0.5, receipt: 0, onHand: 3.5, economic: 3.5, target: 6, decision: "Below target", zone: "red" },
    { day: 30, sales: 0.5, receipt: 0, onHand: 3, economic: 3, target: 6, decision: "Below target", zone: "red" },
    { day: 31, sales: 0.5, receipt: 0, onHand: 2.5, economic: 2.5, target: 6, decision: "Below target", zone: "red" },
    { day: 32, sales: 0.5, receipt: 9, onHand: 11, economic: 11, target: 6, decision: "Receipt +9 (Early)", zone: "overstock" },
    { day: 33, sales: 0.5, receipt: 0, onHand: 10.5, economic: 10.5, target: 6, decision: "Above target", zone: "overstock" },
    { day: 34, sales: 0.5, receipt: 0, onHand: 10, economic: 10, target: 6, decision: "Above target", zone: "overstock" },
    { day: 35, sales: 0.5, receipt: 0, onHand: 9.5, economic: 9.5, target: 6, decision: "Above target", zone: "overstock" },
    { day: 36, sales: 0.5, receipt: 0, onHand: 9, economic: 9, target: 6, decision: "Above target", zone: "green" },
    { day: 37, sales: 0.5, receipt: 0, onHand: 8.5, economic: 8.5, target: 6, decision: "Normal", zone: "green" },
    { day: 38, sales: 0.5, receipt: 0, onHand: 8, economic: 8, target: 6, decision: "Normal", zone: "green" },
    { day: 39, sales: 0.5, receipt: 0, onHand: 7.5, economic: 7.5, target: 6, decision: "Normal", zone: "green" },
    { day: 40, sales: 0.5, receipt: 0, onHand: 7, economic: 7, target: 6, decision: "Normal", zone: "green" },
  ];

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
            <CardTitle>DBM in Action: 20-Day Simulation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-2xl font-bold">Day {currentState.day}</div>
                <div className="flex items-center gap-2">
                  <Badge className={getZoneColor(currentState.zone)}>
                    {currentState.zone.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{currentState.decision}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAnimationDay(0);
                    setIsPlaying(false);
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={animationDay >= simulationData.length - 1}
                >
                  {isPlaying ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
              </div>
            </div>

            {/* Visual Representation - Sawtooth Chart */}
            <div className="space-y-4">
              <div className="relative h-96 border rounded-lg p-6 bg-muted/20">
                <div className="absolute top-2 left-2 bg-background/90 border rounded-lg p-2 text-xs">
                  <div className="font-bold mb-1">Lead-time = {leadTime} days</div>
                </div>

                {/* Legend */}
                <div className="absolute top-2 right-2 bg-background/90 border rounded-lg p-2 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-red-600"></div>
                    <span>On-hand</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 border-t-2 border-green-600 border-dashed"></div>
                    <span>Target</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-orange-500"></div>
                    <span>Economic Inventory</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-400"></div>
                    <span>Sales</span>
                  </div>
                </div>

                {/* Y-axis labels */}
                <div className="absolute left-2 top-16 bottom-16 flex flex-col justify-between text-xs text-muted-foreground">
                  {[12, 10, 8, 6, 4, 2, 0].map(val => (
                    <div key={val}>{val}</div>
                  ))}
                </div>

                {/* Chart area */}
                <div className="ml-8 mt-8 h-[calc(100%-4rem)] relative">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4, 5, 6].map(i => (
                    <div 
                      key={i}
                      className="absolute left-0 right-0 border-t border-muted"
                      style={{ top: `${(i / 6) * 100}%` }}
                    />
                  ))}

                  {/* Target line (dashed green) */}
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <line
                      x1="0%"
                      y1={`${100 - (currentState.target / 12) * 100}%`}
                      x2="100%"
                      y2={`${100 - (currentState.target / 12) * 100}%`}
                      stroke="rgb(34, 197, 94)"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                  </svg>

                  {/* Economic Inventory line (orange) */}
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <polyline
                      points={simulationData
                        .slice(0, animationDay + 1)
                        .map((d, i) => {
                          const x = (i / (simulationData.length - 1)) * 100;
                          const y = 100 - (d.economic / 12) * 100;
                          return `${x}%,${y}%`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="rgb(249, 115, 22)"
                      strokeWidth="2"
                    />
                  </svg>

                  {/* On-Hand inventory line (red sawtooth) */}
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <polyline
                      points={simulationData
                        .slice(0, animationDay + 1)
                        .map((d, i) => {
                          const x = (i / (simulationData.length - 1)) * 100;
                          const y = 100 - (d.onHand / 12) * 100;
                          return `${x}%,${y}%`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="rgb(220, 38, 38)"
                      strokeWidth="2.5"
                    />
                    {/* Current point marker */}
                    <circle
                      cx={`${(animationDay / (simulationData.length - 1)) * 100}%`}
                      cy={`${100 - (currentState.onHand / 12) * 100}%`}
                      r="4"
                      fill="rgb(220, 38, 38)"
                    />
                  </svg>

                  {/* Sales bars at the bottom */}
                  {simulationData.slice(0, animationDay + 1).map((d, i) => 
                    d.sales > 0 ? (
                      <div
                        key={i}
                        className="absolute bg-orange-400"
                        style={{
                          left: `${(i / (simulationData.length - 1)) * 100}%`,
                          bottom: 0,
                          width: '2px',
                          height: `${(d.sales / 1) * 30}px`,
                          transform: 'translateX(-1px)'
                        }}
                      />
                    ) : null
                  )}
                </div>

                {/* X-axis */}
                <div className="absolute bottom-2 left-8 right-2 flex justify-between text-xs text-muted-foreground">
                  <span>Day 0</span>
                  <span>Day {Math.floor(simulationData.length / 2)}</span>
                  <span>Day {simulationData.length - 1}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{currentState.sales.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Sales</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{currentState.receipt}</div>
                  <div className="text-xs text-muted-foreground">Receipt</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{currentState.onHand.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">On-Hand</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-orange-500">{currentState.economic.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Economic</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{currentState.target}</div>
                  <div className="text-xs text-muted-foreground">Target</div>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm bg-primary/5 border border-primary/20 rounded-lg p-3">
                <div className="text-primary font-semibold">ℹ</div>
                <div>
                  <strong>Sawtooth Pattern:</strong> On-hand inventory (red line) decreases gradually with daily sales, 
                  then jumps up sharply when receipts arrive. Economic inventory (orange line) includes on-hand plus on-order. 
                  The target (green dashed line) represents the optimal buffer level. Lead-time variance is shown when receipts 
                  arrive earlier or later than expected.
                </div>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? "Hide" : "Show"} Detailed Timeline
            </Button>

            {showDetails && (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Day</th>
                        <th className="p-2 text-right">Sales</th>
                        <th className="p-2 text-right">Receipt</th>
                        <th className="p-2 text-right">On-Hand</th>
                        <th className="p-2 text-right">Economic</th>
                        <th className="p-2 text-right">Target</th>
                        <th className="p-2 text-center">Zone</th>
                        <th className="p-2 text-left">Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationData.map((day, idx) => (
                        <tr 
                          key={idx} 
                          className={`border-t ${idx === animationDay ? 'bg-primary/10' : ''}`}
                        >
                          <td className="p-2">{day.day}</td>
                          <td className="p-2 text-right">{day.sales.toFixed(1)}</td>
                          <td className="p-2 text-right font-bold text-blue-600">
                            {day.receipt > 0 ? `+${day.receipt}` : '-'}
                          </td>
                          <td className="p-2 text-right font-mono text-red-600">{day.onHand.toFixed(1)}</td>
                          <td className="p-2 text-right font-mono text-orange-500">{day.economic.toFixed(1)}</td>
                          <td className="p-2 text-right font-mono text-green-600">{day.target}</td>
                          <td className="p-2 text-center">
                            <Badge className={`${getZoneColor(day.zone)} text-xs`}>
                              {day.zone}
                            </Badge>
                          </td>
                          <td className="p-2 text-xs">{day.decision}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
