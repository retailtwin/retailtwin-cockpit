import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Play, AlertCircle, Loader2, Info } from "lucide-react";
import { format, differenceInMonths } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCommonScope } from "@/hooks/useCommonScope";
import { ProductGroupPicker } from "@/components/ProductGroupPicker";
import { StorePicker } from "@/components/StorePicker";

interface SimulationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: SimulationConfig) => void;
}

export interface SimulationConfig {
  location: string;
  productSKUs: string[] | 'ALL';
  dateRange: DateRange;
  preset: string;
}

type PresetType = "quick" | "standard" | "quarter" | "full" | "custom";

const PRESETS = {
  quick: { name: "Quick Test", months: 1, description: "1 month, ideal for testing" },
  standard: { name: "Standard Test", months: 3, description: "3 months, balanced testing" },
  quarter: { name: "Quarter Analysis", months: 3, description: "3 months, all data" },
  full: { name: "Full Year", months: 12, description: "12 months, complete analysis" },
  custom: { name: "Custom", months: 0, description: "Define your own scope" },
};

export const SimulationConfigDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: SimulationConfigDialogProps) => {
  const commonScope = useCommonScope();
  const [selectedPreset, setSelectedPreset] = useState<PresetType>("quick");
  const [location, setLocation] = useState('');
  const [productSKUs, setProductSKUs] = useState<string[] | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<{
    recordCount: number;
    estimatedTime: string;
    warning?: string;
  } | null>(null);

  // Initialize defaults when dialog opens and data is loaded
  useEffect(() => {
    if (open && !commonScope.isLoading && commonScope.locations.length > 0) {
      // Set first location as default
      if (!location) {
        setLocation(commonScope.locations[0].code);
      }

      // Set date range based on preset
      if (commonScope.dateRange && !dateRange) {
        const endDate = new Date(commonScope.dateRange.max);
        const startDate = new Date(endDate);
        const preset = PRESETS[selectedPreset];
        startDate.setMonth(endDate.getMonth() - preset.months);
        
        const minDate = new Date(commonScope.dateRange.min);
        if (startDate < minDate) {
          startDate.setTime(minDate.getTime());
        }
        
        setDateRange({ from: startDate, to: endDate });
      }
    }
  }, [open, commonScope.isLoading, commonScope.locations, commonScope.dateRange]);

  // Estimate record count when config changes
  useEffect(() => {
    if (!open || !dateRange?.from || !dateRange?.to || !location) return;

    const estimateRecords = async () => {
      setEstimating(true);
      try {
        const diffTime = Math.abs(dateRange.to!.getTime() - dateRange.from!.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        const productCount = productSKUs === 'ALL' ? commonScope.totalProducts : productSKUs.length;
        const recordCount = days * 1 * productCount;

        const estimatedSeconds = Math.ceil(recordCount / 1000);
        const estimatedTime =
          estimatedSeconds < 60
            ? `${estimatedSeconds}s`
            : `${Math.ceil(estimatedSeconds / 60)}min`;

        let warning: string | undefined;
        if (recordCount > 200000) {
          warning = "Large dataset detected. Consider reducing the scope.";
        } else if (recordCount > 100000) {
          warning = "Medium-large dataset. Processing may take a while.";
        }

        setEstimate({ recordCount, estimatedTime, warning });
      } catch (error) {
        console.error("Error estimating records:", error);
        setEstimate({ recordCount: 0, estimatedTime: "Unknown", warning: "Could not estimate" });
      } finally {
        setEstimating(false);
      }
    };

    estimateRecords();
  }, [open, location, productSKUs, dateRange, commonScope.totalProducts]);

  const handlePresetChange = (preset: PresetType) => {
    setSelectedPreset(preset);
    
    // Update date range based on preset
    if (preset !== "custom" && commonScope.dateRange) {
      const endDate = new Date(commonScope.dateRange.max);
      const startDate = new Date(endDate);
      const presetConfig = PRESETS[preset];
      startDate.setMonth(endDate.getMonth() - presetConfig.months);
      
      const minDate = new Date(commonScope.dateRange.min);
      if (startDate < minDate) {
        startDate.setTime(minDate.getTime());
      }
      
      setDateRange({ from: startDate, to: endDate });
    }
  };

  const handleConfirm = () => {
    if (!dateRange?.from || !dateRange?.to || !location) return;

    onConfirm({
      location,
      productSKUs,
      dateRange,
      preset: PRESETS[selectedPreset].name,
    });
    onOpenChange(false);
  };

  const getDayCount = () => {
    if (!dateRange?.from || !dateRange?.to) return 0;
    const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const getProductCount = () => productSKUs === 'ALL' ? commonScope.totalProducts : productSKUs.length;
  
  const getMonthCount = () => {
    if (!dateRange?.from || !dateRange?.to) return 0;
    return differenceInMonths(dateRange.to, dateRange.from) + 1;
  };

  if (commonScope.isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading available data...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Simulation Scope</DialogTitle>
          <DialogDescription>
            Select what portion of your data to simulate. Start small for quick testing, then expand.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Common Scope Display */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 space-y-1 text-sm">
                  <p className="font-semibold text-primary">Available Data</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Period:</span>
                      <p className="font-medium">
                        {commonScope.dateRange 
                          ? `${format(new Date(commonScope.dateRange.min), 'MMM d, yyyy')} → ${format(new Date(commonScope.dateRange.max), 'MMM d, yyyy')} (${differenceInMonths(new Date(commonScope.dateRange.max), new Date(commonScope.dateRange.min)) + 1} months)`
                          : 'Loading...'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Locations:</span>
                      <p className="font-medium">{commonScope.locations.length} store{commonScope.locations.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Products:</span>
                      <p className="font-medium">{commonScope.totalProducts} SKUs across {commonScope.productGroups.size} categories</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Presets */}
          <div className="space-y-2">
            <Label>Quick Presets</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(Object.keys(PRESETS) as PresetType[]).filter(p => p !== 'custom').map((preset) => (
                <Button
                  key={preset}
                  variant={selectedPreset === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetChange(preset)}
                  className="flex flex-col h-auto py-2"
                >
                  <span className="font-medium text-xs">{PRESETS[preset].name}</span>
                  <span className="text-xs opacity-70">{PRESETS[preset].description}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Store Picker */}
          <StorePicker
            locations={commonScope.locations}
            selectedLocation={location}
            onLocationChange={setLocation}
          />

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Select Time Period</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({getDayCount()} days, {getMonthCount()} month{getMonthCount() !== 1 ? 's' : ''})
                        </span>
                      </>
                    ) : (
                      format(dateRange.from, "MMM d, yyyy")
                    )
                  ) : (
                    <span>Select date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    setSelectedPreset("custom");
                  }}
                  numberOfMonths={2}
                  defaultMonth={commonScope.dateRange ? new Date(commonScope.dateRange.min) : undefined}
                  disabled={(date) =>
                    commonScope.dateRange
                      ? date < new Date(commonScope.dateRange.min) || date > new Date(commonScope.dateRange.max)
                      : false
                  }
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Product Group Picker */}
          <ProductGroupPicker
            products={commonScope.products}
            selectedSKUs={productSKUs}
            onSelectionChange={setProductSKUs}
          />

          {/* Estimation Preview */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Estimated Scope
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">SKUs:</span>
                  <p className="font-medium">{getProductCount()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <p className="font-medium">1 store</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Days:</span>
                  <p className="font-medium">{getDayCount()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Records:</span>
                  {estimating ? (
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </div>
                  ) : (
                    <p className="font-medium">≈ {estimate?.recordCount.toLocaleString() || "—"}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Processing Time:</span>
                  {estimating ? (
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </div>
                  ) : (
                    <p className="font-medium">~{estimate?.estimatedTime || "—"}</p>
                  )}
                </div>
              </div>

              {estimate?.warning && (
                <Alert variant="default" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{estimate.warning}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!dateRange?.from || !dateRange?.to || !location}>
            <Play className="mr-2 h-4 w-4" />
            Run Simulation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
