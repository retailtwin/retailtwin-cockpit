import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, TrendingUp, AlertTriangle } from "lucide-react";

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
            <strong>Your inventory is working harder:</strong> By optimizing your buffers, you're 
            turning stock {turnsImprovement.toFixed(1)}% faster while serving customers {serviceLevelGain.toFixed(1)}% better. 
            That means cash flows back to you quicker, and shelves stay stocked where it matters.
          </AlertDescription>
        </Alert>

        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm">
            <strong>You're leaving money on the table:</strong> Right now, there's a {cashGap} cash gap—
            money tied up in excess stock while you're also missing sales due to stockouts. 
            The simulation shows you could cut stockouts by {stockoutReduction.toFixed(0)}% and free up that trapped cash.
          </AlertDescription>
        </Alert>

        <div className="pt-2 text-sm text-muted-foreground border-t">
          <p className="leading-relaxed">
            <strong className="text-foreground">Think of it this way:</strong> Your current approach is like 
            driving with one foot on the gas and one on the brake. You're rushing to restock some items while 
            others gather dust on the shelf. Dynamic Buffer Management (DBM) recalibrates daily—so you stock 
            what sells, when it sells, without the guesswork. Less waste, fewer lost sales, better cash flow.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
