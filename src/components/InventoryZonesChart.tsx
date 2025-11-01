import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart, ReferenceLine } from "recharts";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InventoryZoneData {
  sku: string;
  sku_name: string;
  rolling_21d_sales: number;
  rolling_21d_avg_daily: number;
  avg_on_hand: number;
  avg_target: number;
  avg_economic: number;
  avg_economic_overstock: number;
  avg_weekly_sales: number;
  stockout_days: number;
  total_days: number;
}

interface InventoryZonesChartProps {
  data: InventoryZoneData[];
  isLoading?: boolean;
}

export const InventoryZonesChart = ({ data, isLoading }: InventoryZonesChartProps) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No inventory data available for the selected period.
        </AlertDescription>
      </Alert>
    );
  }

  // Prepare chart data
  const chartData = data.map((item, index) => {
    const target = Number(item.avg_target.toFixed(0));
    const redZone = Number((target / 3).toFixed(2));
    const yellowZone = Number((2 * target / 3).toFixed(2));
    
    return {
      sku: item.sku,
      skuName: item.sku_name,
      rank: index + 1,
      onHand: Number(item.avg_on_hand.toFixed(0)),
      target: target,
      economic: Number(item.avg_economic.toFixed(0)),
      economicOverstock: Number(item.avg_economic_overstock.toFixed(0)),
      redZoneTop: redZone,
      yellowZoneTop: yellowZone,
      greenZoneTop: target,
      rolling21dSales: item.rolling_21d_sales,
      dailyAvg21d: Number(item.rolling_21d_avg_daily.toFixed(2)),
      daysOfSupply: item.rolling_21d_avg_daily > 0 ? Number((item.avg_on_hand / item.rolling_21d_avg_daily).toFixed(1)) : 0,
      stockoutDays: item.stockout_days,
      isUnderTarget: item.avg_target > item.avg_economic,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm">{data.skuName}</p>
          <p className="text-xs text-muted-foreground">SKU: {data.sku}</p>
          <p className="text-xs mt-2">Rank: #{data.rank} of {chartData.length}</p>
          <p className="text-xs font-semibold">21-Day Sales: {data.rolling21dSales.toFixed(0)} units</p>
          <p className="text-xs">Daily Avg (21d): {data.dailyAvg21d} units/day</p>
          <div className="border-t mt-2 pt-2">
            <p className="text-xs">On Hand: {data.onHand} units</p>
            <p className="text-xs">Days of Supply: {data.daysOfSupply} days</p>
            <p className="text-xs">Target: {data.target} units</p>
            <p className="text-xs">Economic: {data.economic} units</p>
            <p className="text-xs">Stockout Days: {data.stockoutDays}</p>
          </div>
          <div className="border-t mt-2 pt-2">
            <p className="text-xs font-semibold">Zones:</p>
            <p className="text-xs text-destructive">Red (0-{data.redZoneTop})</p>
            <p className="text-xs text-yellow-600">Yellow ({data.redZoneTop}-{data.yellowZoneTop})</p>
            <p className="text-xs text-green-600">Green ({data.yellowZoneTop}-{data.greenZoneTop})</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate summary stats
  const totalSkus = data.length;
  const totalStockoutDays = data.reduce((sum, item) => sum + item.stockout_days, 0);
  const avgStockoutRate = ((totalStockoutDays / (totalSkus * (data[0]?.total_days || 1))) * 100).toFixed(1);
  const skusUnderTarget = data.filter(item => item.avg_target > item.avg_economic).length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total SKUs</div>
          <div className="text-2xl font-bold">{totalSkus}</div>
        </Card>
        
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">SKUs Under Target</div>
          <div className="text-2xl font-bold text-destructive">{skusUnderTarget}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {((skusUnderTarget / totalSkus) * 100).toFixed(1)}% of total
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Avg Stockout Rate</div>
          <div className="text-2xl font-bold">{avgStockoutRate}%</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Stockout Days</div>
          <div className="text-2xl font-bold">{totalStockoutDays}</div>
        </Card>
      </div>

      {/* Inventory Zones Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Inventory Zones by SKU (Ranked by 21-Day Sales)</h3>
        <p className="text-sm text-muted-foreground mb-6">
          SKUs ranked left to right by rolling 21-day sales rate. Each zone represents 1/3 of the Target: Red (0-Target/3), Yellow (Target/3-2·Target/3), Green (2·Target/3-Target).
        </p>
        <ResponsiveContainer width="100%" height={500}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="rank" 
              label={{ value: 'SKU Rank (by 21-Day Sales)', position: 'insideBottom', offset: -5 }}
              className="text-xs"
            />
            <YAxis 
              label={{ value: 'Units', angle: -90, position: 'insideLeft' }}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Zone bars - stacked to show zones */}
            <Bar 
              dataKey="redZoneTop" 
              fill="hsl(var(--destructive))"
              fillOpacity={0.3}
              name="Red Zone (Target)"
              stackId="zones"
            />
            <Bar 
              dataKey={(data) => Math.max(0, data.yellowZoneTop - data.redZoneTop)}
              fill="rgb(202, 138, 4)"
              fillOpacity={0.3}
              name="Yellow Zone (Economic - Target)"
              stackId="zones"
            />
            <Bar 
              dataKey={(data) => Math.max(0, data.greenZoneTop - data.yellowZoneTop)}
              fill="rgb(34, 197, 94)"
              fillOpacity={0.3}
              name="Green Zone (Overstock)"
              stackId="zones"
            />
            
            {/* Actual inventory levels */}
            <Bar 
              dataKey="onHand" 
              fill="hsl(var(--primary))"
              name="On Hand"
              radius={[4, 4, 0, 0]}
            />
            
            {/* Economic inventory line */}
            <Line 
              type="monotone" 
              dataKey="economic" 
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={false}
              name="Economic Level"
            />
            
            {/* Target/Economic status indicators */}
            {chartData.map((item, index) => 
              item.isUnderTarget ? (
                <ReferenceLine
                  key={`under-${index}`}
                  x={item.rank}
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                />
              ) : null
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Insights */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-2 w-2 rounded-full bg-destructive mt-1.5" />
            <div>
              <p className="text-sm font-medium">Critical Stock Levels</p>
              <p className="text-sm text-muted-foreground">
                {skusUnderTarget} SKUs ({((skusUnderTarget / totalSkus) * 100).toFixed(1)}%) have target inventory exceeding economic levels, 
                indicating potential stock issues or overambitious targets.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="h-2 w-2 rounded-full bg-yellow-600 mt-1.5" />
            <div>
              <p className="text-sm font-medium">Stockout Risk</p>
              <p className="text-sm text-muted-foreground">
                Average stockout rate of {avgStockoutRate}% across all SKUs with {totalStockoutDays} total stockout days recorded.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-2 w-2 rounded-full bg-green-600 mt-1.5" />
            <div>
              <p className="text-sm font-medium">Optimization Opportunity</p>
              <p className="text-sm text-muted-foreground">
                Focus on top-ranked SKUs (left side) as they have the highest recent sales velocity (21-day rolling). 
                Ensuring these maintain green zone levels maximizes revenue protection based on current demand.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
