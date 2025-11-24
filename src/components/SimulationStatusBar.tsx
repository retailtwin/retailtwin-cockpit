import { Badge } from "@/components/ui/badge";
import { Settings, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SimulationStatusBarProps {
  hasSimulation: boolean;
  productionLeadTime?: number;
  shippingLeadTime?: number;
  orderDays?: string;
  onViewSettings?: () => void;
  simulationStatus?: 'idle' | 'running' | 'polling' | 'complete';
}

export const SimulationStatusBar = ({
  hasSimulation,
  productionLeadTime,
  shippingLeadTime,
  orderDays,
  onViewSettings,
  simulationStatus = 'idle',
}: SimulationStatusBarProps) => {
  // Calculate total lead time and format shipping frequency
  const totalLeadTime = (productionLeadTime || 0) + (shippingLeadTime || 0);
  
  // Format order days for display
  const formatOrderDays = (days?: string) => {
    if (!days) return "Unknown";
    const daysList = days.split(',').map(d => d.trim());
    const dayCount = daysList.length;
    
    if (dayCount === 7) return "7 Days per Week";
    
    // Capitalize first letter of each day
    const formattedDays = daysList.map(day => 
      day.charAt(0).toUpperCase() + day.slice(1)
    ).join(', ');
    
    return `${dayCount} Days per Week (${formattedDays})`;
  };
  // Show loading state if lead times haven't loaded yet
  if (productionLeadTime === undefined && shippingLeadTime === undefined) {
    return (
      <div className="flex items-center justify-center py-3 px-4 bg-muted/50 rounded-lg border border-border/50">
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-primary/5 rounded-lg border border-primary/20">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Simulation Settings</span>
        <Badge variant="default" className="gap-1">
          DBM
        </Badge>
        {simulationStatus === 'running' && (
          <Badge variant="secondary" className="gap-1 animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            Running...
          </Badge>
        )}
        {simulationStatus === 'polling' && (
          <Badge variant="secondary" className="gap-1 animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking results...
          </Badge>
        )}
        {simulationStatus === 'complete' && (
          <Badge variant="default" className="gap-1 bg-success text-success-foreground">
            <CheckCircle2 className="h-3 w-3" />
            Complete!
          </Badge>
        )}
        <div className="flex items-center gap-2">
          {totalLeadTime > 0 && (
            <Badge variant="secondary" className="font-normal">
              Lead Time: {totalLeadTime} days
            </Badge>
          )}
          {orderDays && (
            <Badge variant="secondary" className="font-normal">
              Shipping Frequency: {formatOrderDays(orderDays)}
            </Badge>
          )}
        </div>
      </div>
      {onViewSettings && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewSettings}
          className="gap-2 text-xs"
        >
          <Settings className="h-3 w-3" />
          View Settings
        </Button>
      )}
    </div>
  );
};
