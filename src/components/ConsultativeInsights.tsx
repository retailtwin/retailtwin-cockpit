import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lightbulb, TrendingUp, AlertTriangle, FileText } from "lucide-react";
import { Link } from "react-router-dom";

interface ConsultativeInsightsProps {
  cashGap: string;
  serviceLevelGain: number;
  turnsImprovement: number;
  stockoutReduction: number;
}

export const ConsultativeInsights = ({ 
  cashGap, 
  serviceLevelGain,
  turnsImprovement,
  stockoutReduction
}: ConsultativeInsightsProps) => {
  return (
    <Card className="shadow-lg bg-gradient-to-br from-card to-card/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-semibold">What This Means for Your Business</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-success/50 bg-success/10">
          <TrendingUp className="h-4 w-4 text-success" />
          <AlertDescription className="text-sm">
            <strong>Operational Improvement:</strong> Optimized buffers improve inventory turns by {turnsImprovement.toFixed(1)}% 
            and service level by {serviceLevelGain.toFixed(1)}%. Stockout reduction of {stockoutReduction.toFixed(0)}% 
            accelerates cash conversion and maintains availability.
          </AlertDescription>
        </Alert>

        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm">
            <strong>Cash Gap Analysis ({cashGap}):</strong> Current inventory policy creates a dual loss: 
            Missed Throughput Value from stockouts and Redundant Inventory Value from excess stock. 
            Primary sources include slow-moving SKUs with excessive buffer days and high-demand items with inadequate coverage.
          </AlertDescription>
        </Alert>

        <div className="pt-2 text-sm text-muted-foreground border-t space-y-3">
          <p className="leading-relaxed">
            <strong className="text-foreground">In Detail:</strong> Missed Throughput Value (MTV) represents lost revenue 
            from stockouts, concentrated in high-velocity SKUs. Redundant Inventory Value (RIV) indicates capital tied up 
            in slow-moving inventory, typically in items with declining demand patterns or excessive safety stock.
          </p>
          <p className="leading-relaxed">
            <strong className="text-foreground">Compliance Note:</strong> Analysis indicates lead-times were regularly 
            extended beyond configured parameters for multiple locations, resulting in buffer inflation. Recommend reviewing 
            supplier performance data and adjusting lead-time rules or initiating corrective action with vendors.
          </p>
          <div className="pt-2">
            <Link to="/report">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                View Detailed Reports
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
