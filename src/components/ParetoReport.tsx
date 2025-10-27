import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter } from "recharts";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ParetoDataPoint {
  sku: string;
  sku_name: string;
  total_units_sold: number;
  cumulative_percent: number;
  rank: number;
  is_selected_sku: boolean;
  availability_percent: number;
}

interface ParetoReportProps {
  data: ParetoDataPoint[];
  selectedSku?: string;
  isLoading?: boolean;
}

export const ParetoReport = ({ data, selectedSku, isLoading }: ParetoReportProps) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No sales data available for the selected period.
        </AlertDescription>
      </Alert>
    );
  }

  // Find selected SKU data
  const selectedSkuData = data.find(d => d.is_selected_sku);
  const totalSkus = data.length;
  
  // Calculate 80/20 stats
  const top20PercentCount = Math.ceil(totalSkus * 0.2);
  const top20PercentData = data.slice(0, top20PercentCount);
  const top20Contribution = top20PercentData[top20PercentData.length - 1]?.cumulative_percent || 0;

  // Prepare chart data
  const chartData = data.map(d => ({
    rank: d.rank,
    cumulativePercent: Number(d.cumulative_percent.toFixed(1)),
    availability: Number(d.availability_percent.toFixed(1)),
    isSelected: d.is_selected_sku,
    sku: d.sku,
    skuName: d.sku_name,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm">{data.skuName}</p>
          <p className="text-xs text-muted-foreground">SKU: {data.sku}</p>
          <p className="text-xs mt-1">Rank: #{data.rank} of {totalSkus}</p>
          <p className="text-xs">Cumulative Sales: {data.cumulativePercent}%</p>
          <p className="text-xs">Availability: {data.availability}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          The Pareto curve measures the contribution of each next SKU (stock keeping unit) to total sales, 
          ranked by highest revenue contribution. This visualization helps identify which items drive the most value.
        </p>
        <p className="text-sm text-muted-foreground">
          Product availability % is calculated by counting the number of days when an item has 1 or more units 
          on hand for each day of the week (measured 7 days rolling), divided by 7.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total SKUs</div>
          <div className="text-2xl font-bold">{totalSkus}</div>
        </Card>
        
        {selectedSkuData && (
          <Card className="p-4 border-primary">
            <div className="text-sm text-muted-foreground">Selected SKU Rank</div>
            <div className="text-2xl font-bold">
              #{selectedSkuData.rank} of {totalSkus}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {selectedSkuData.cumulative_percent.toFixed(1)}% cumulative
            </div>
          </Card>
        )}
        
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Top 20% Contribution</div>
          <div className="text-2xl font-bold">{top20Contribution.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            {top20PercentCount} SKUs
          </div>
        </Card>
      </div>

      {/* Pareto Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Pareto Distribution</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="rank" 
              label={{ value: 'SKU Rank (Best to Worst)', position: 'insideBottom', offset: -5 }}
              className="text-xs"
            />
            <YAxis 
              yAxisId="left"
              label={{ value: 'Cumulative Sales Contribution (%)', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
              className="text-xs"
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              label={{ value: 'Product Availability (%)', angle: 90, position: 'insideRight' }}
              domain={[0, 100]}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Cumulative sales curve */}
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="cumulativePercent" 
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              name="Cumulative Sales %"
            />
            
            {/* Availability line */}
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="availability" 
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="Availability %"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Scatter plot for selected SKU */}
      {selectedSkuData && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">SKU Position Detail</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="rank" 
                type="number"
                domain={[1, totalSkus]}
                label={{ value: 'SKU Rank', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                dataKey="cumulativePercent" 
                label={{ value: 'Sales Contribution (%)', angle: -90, position: 'insideLeft' }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* All SKUs */}
              <Scatter 
                name="All SKUs" 
                data={chartData.filter(d => !d.isSelected)} 
                fill="hsl(var(--muted-foreground))"
                opacity={0.4}
              />
              
              {/* Selected SKU */}
              <Scatter 
                name="Selected SKU" 
                data={chartData.filter(d => d.isSelected)} 
                fill="hsl(var(--primary))"
                shape="star"
                r={8}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
};
