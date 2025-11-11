import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SimulationStatusBarProps {
  hasSimulation: boolean;
  productionLeadTime?: number;
  shippingLeadTime?: number;
  onViewSettings?: () => void;
}

export const SimulationStatusBar = ({
  hasSimulation,
  productionLeadTime,
  shippingLeadTime,
  onViewSettings,
}: SimulationStatusBarProps) => {
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
        <div className="flex items-center gap-2">
          {productionLeadTime !== undefined && (
            <Badge variant="secondary" className="font-normal">
              Lead Time: {productionLeadTime}d
            </Badge>
          )}
          {shippingLeadTime !== undefined && (
            <Badge variant="secondary" className="font-normal">
              Shipping: {shippingLeadTime}d
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
