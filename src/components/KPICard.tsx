import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowUp, ArrowDown, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KPICardProps {
  title: string;
  value: string | number;
  delta7d?: number;
  sparklineSeries?: { value: number }[];
  tooltip?: string;
  unit?: string;
  invertColors?: boolean;
}

export const KPICard = ({
  title,
  value,
  delta7d,
  sparklineSeries = [],
  tooltip,
  unit = "",
  invertColors = false,
}: KPICardProps) => {
  // Arrow direction is based on actual delta sign
  const showUpArrow = delta7d && delta7d > 0;
  const showDownArrow = delta7d && delta7d < 0;
  
  // Color is based on whether the change is good or bad
  const isGoodChange = invertColors 
    ? delta7d && delta7d < 0 
    : delta7d && delta7d > 0;
  const isBadChange = invertColors 
    ? delta7d && delta7d > 0 
    : delta7d && delta7d < 0;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            {title}
          </CardTitle>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight">
              {value}
              {unit && <span className="text-xl text-muted-foreground ml-1">{unit}</span>}
            </span>
            {delta7d !== undefined && (
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  isGoodChange
                    ? "text-success"
                    : isBadChange
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {showUpArrow && <ArrowUp className="h-4 w-4" />}
                {showDownArrow && <ArrowDown className="h-4 w-4" />}
                {Math.abs(delta7d).toFixed(1)}%
              </div>
            )}
          </div>
          
          {sparklineSeries.length > 0 && (
            <ResponsiveContainer width="100%" height={60}>
              <AreaChart data={sparklineSeries}>
                <defs>
                  <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#sparkGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
