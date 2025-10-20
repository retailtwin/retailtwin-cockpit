import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

interface InventoryGraphProps {
  data: Array<{
    day: number;
    sales: number;
    inventory: number;
    inventorySimulated: number;
  }>;
}

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
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem'
              }}
            />
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
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
