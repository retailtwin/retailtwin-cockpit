import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BufferBreakdown {
  sku: string;
  skuName: string;
  targetUnits: number;
  economicUnits: number;
  onHandUnits: number;
  onOrderUnits: number;
  inTransitUnits: number;
  avgWeeklySales: number;
  calculation: {
    initial: number;
    afterAccelerator: number;
    acceleratorApplied: boolean;
    acceleratorType: 'up' | 'down' | 'none';
    acceleratorReason: string;
    minimumTarget: number;
    safetyLevel: number;
    excludedLevel: number;
    leadTimeDays: number;
  };
}

interface SkuBufferAnalysisProps {
  data: BufferBreakdown | null;
  isLoading?: boolean;
}

export const SkuBufferAnalysis = ({ data, isLoading }: SkuBufferAnalysisProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Select a SKU to view detailed buffer calculation analysis.
        </AlertDescription>
      </Alert>
    );
  }

  const { calculation } = data;
  const acceleratorDelta = calculation.afterAccelerator - calculation.initial;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Buffer Calculation Analysis</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                SKU: {data.sku} - {data.skuName}
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              Target: {data.targetUnits} units
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Calculation Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calculation Flow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Base Calculation */}
          <div className="border-l-4 border-primary pl-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">1</span>
              </div>
              <h4 className="font-semibold">Base DBM Calculation</h4>
            </div>
            <div className="ml-10 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Initial Target:</span>
                <span className="font-medium">{calculation.initial} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum Target Setting:</span>
                <span className="font-medium">{calculation.minimumTarget} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Safety Level:</span>
                <span className="font-medium">{calculation.safetyLevel} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Excluded Level:</span>
                <span className="font-medium">{calculation.excludedLevel} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead Time:</span>
                <span className="font-medium">{calculation.leadTimeDays} days</span>
              </div>
            </div>
          </div>

          {/* Step 2: Accelerator */}
          <div className={`border-l-4 pl-4 ${
            calculation.acceleratorApplied 
              ? calculation.acceleratorType === 'up' 
                ? 'border-green-500' 
                : 'border-orange-500'
              : 'border-muted'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                calculation.acceleratorApplied
                  ? calculation.acceleratorType === 'up'
                    ? 'bg-green-500/10'
                    : 'bg-orange-500/10'
                  : 'bg-muted'
              }`}>
                <span className={`text-sm font-semibold ${
                  calculation.acceleratorApplied
                    ? calculation.acceleratorType === 'up'
                      ? 'text-green-600'
                      : 'text-orange-600'
                    : 'text-muted-foreground'
                }`}>2</span>
              </div>
              <h4 className="font-semibold">Accelerator / Responsiveness</h4>
              {calculation.acceleratorApplied && (
                calculation.acceleratorType === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : calculation.acceleratorType === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )
              )}
            </div>
            <div className="ml-10 space-y-2 text-sm">
              {calculation.acceleratorApplied ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={calculation.acceleratorType === 'up' ? 'default' : 'destructive'}>
                      {calculation.acceleratorType === 'up' ? 'Increased' : 'Decreased'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reason:</span>
                    <span className="font-medium">{calculation.acceleratorReason}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delta:</span>
                    <span className={`font-medium ${
                      acceleratorDelta > 0 ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {acceleratorDelta > 0 ? '+' : ''}{acceleratorDelta} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Final Target:</span>
                    <span className="font-bold text-primary">{calculation.afterAccelerator} units</span>
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground italic">
                  No accelerator applied - {calculation.acceleratorReason}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current State */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Inventory State</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">On Hand:</span>
                <span className="font-medium">{data.onHandUnits} units</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">On Order:</span>
                <span className="font-medium">{data.onOrderUnits} units</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">In Transit:</span>
                <span className="font-medium">{data.inTransitUnits} units</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Economic Units:</span>
                <span className="font-medium">{data.economicUnits} units</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Target Units:</span>
                <span className="font-medium">{data.targetUnits} units</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Weekly Sales:</span>
                <span className="font-medium">{data.avgWeeklySales.toFixed(1)} units/week</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Buffer Status:</span>
              <Badge variant={
                data.economicUnits >= data.targetUnits ? 'default' : 'destructive'
              }>
                {data.economicUnits >= data.targetUnits 
                  ? `At/Above Target (${((data.economicUnits / data.targetUnits) * 100).toFixed(0)}%)`
                  : `Below Target (${((data.economicUnits / data.targetUnits) * 100).toFixed(0)}%)`
                }
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Explanation */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Why is the target {data.targetUnits} units?</strong>
          <p className="mt-2 text-sm">
            {calculation.acceleratorApplied 
              ? `The base calculation set the target to ${calculation.initial} units, but the ${calculation.acceleratorType} accelerator ${calculation.acceleratorType === 'up' ? 'increased' : 'decreased'} it by ${Math.abs(acceleratorDelta)} units because ${calculation.acceleratorReason.toLowerCase()}.`
              : `The target is ${calculation.initial} units based on the base DBM calculation. No accelerator was applied because ${calculation.acceleratorReason.toLowerCase()}.`
            }
            {calculation.initial === calculation.minimumTarget && ` This matches the configured minimum target of ${calculation.minimumTarget} units.`}
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
};
