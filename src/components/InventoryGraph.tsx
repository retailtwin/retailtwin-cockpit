import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, TooltipProps } from "recharts";
import { AlertCircle } from "lucide-react";

interface InventoryGraphProps {
  data: Array<{
    day: string | number;
    sales: number;
    inventory: number;
    inventorySimulated: number;
    targetUnits?: number;
    economicUnits?: number;
  }>;
}

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const sales = payload.find(p => p.dataKey === "sales")?.value ?? 0;
  const inventory = payload.find(p => p.dataKey === "inventory")?.value ?? 0;
  const inventorySimulated = payload.find(p => p.dataKey === "inventorySimulated")?.value ?? 0;
  const targetUnits = payload.find(p => p.dataKey === "targetUnits")?.value ?? 0;
  const economicUnits = payload.find(p => p.dataKey === "economicUnits")?.value ?? 0;
  
  const isStockoutCurrent = inventory <= 0;
  const isStockoutSimulated = inventorySimulated <= 0;
  
  // Calculate DBM zone
  let zone = "unknown";
  let zoneColor = "hsl(var(--muted-foreground))";
  if (targetUnits > 0) {
    if (inventory > targetUnits) {
      zone = "Overstock";
      zoneColor = "hsl(var(--chart-5))";
    } else if (inventory > targetUnits * 2/3) {
      zone = "Green";
      zoneColor = "hsl(var(--success))";
    } else if (inventory > targetUnits * 1/3) {
      zone = "Yellow";
      zoneColor = "hsl(var(--warning))";
    } else {
      zone = "Red";
      zoneColor = "hsl(var(--destructive))";
    }
  }

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="font-semibold mb-2 text-popover-foreground">{label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Sales:</span>
          <span className="font-medium" style={{ color: 'hsl(var(--accent))' }}>{sales.toFixed(0)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Inventory (Current):</span>
          <div className="flex items-center gap-1">
            <span className="font-medium" style={{ color: 'hsl(var(--destructive))' }}>{inventory.toFixed(0)}</span>
            {isStockoutCurrent && (
              <AlertCircle className="h-3 w-3 text-destructive" />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Inventory (Simulated):</span>
          <div className="flex items-center gap-1">
            <span className="font-medium" style={{ color: 'hsl(var(--success))' }}>{inventorySimulated.toFixed(0)}</span>
            {isStockoutSimulated && (
              <AlertCircle className="h-3 w-3 text-destructive" />
            )}
          </div>
        </div>
        {targetUnits > 0 && (
          <>
            <div className="h-px bg-border my-2" />
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Target Units:</span>
              <span className="font-medium text-primary">{targetUnits.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Economic Units:</span>
              <span className="font-medium">{economicUnits.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">DBM Zone:</span>
              <span className="font-semibold" style={{ color: zoneColor }}>{zone}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const InventoryGraph = ({ data }: InventoryGraphProps) => {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Sales & Inventory Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="day" 
              label={{ value: 'Day', position: 'insideBottom', offset: -5 }}
              className="text-xs"
            />
            <YAxis 
              label={{ value: 'Units', angle: -90, position: 'insideLeft' }}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="sales" 
              stroke="hsl(var(--accent))" 
              name="Sales"
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="inventory" 
              stroke="hsl(var(--destructive))" 
              name="Inventory (Current)"
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="inventorySimulated" 
              stroke="hsl(var(--success))" 
              name="Inventory (Simulated)"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
            />
            <Line 
              type="monotone" 
              dataKey="targetUnits" 
              stroke="hsl(var(--primary))" 
              name="Target Units"
              strokeWidth={2}
              dot={false}
              strokeDasharray="3 3"
            />
            <Line 
              type="monotone" 
              dataKey="economicUnits" 
              stroke="hsl(var(--chart-2))" 
              name="Economic Units"
              strokeWidth={1}
              dot={false}
              opacity={0.6}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
