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
import { Calendar, Play, AlertCircle, Loader2, Info, AlertTriangle } from "lucide-react";
import { format, differenceInMonths } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCommonScope } from "@/hooks/useCommonScope";
import { ProductGroupPicker } from "@/components/ProductGroupPicker";
import { StorePicker } from "@/components/StorePicker";
import { Progress } from "@/components/ui/progress";
import { getContiguousValidDateRange, type ContiguousDateRange } from "@/lib/supabase-helpers";

interface SimulationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: SimulationConfig) => void;
  validDates?: Set<string> | null;
}

export interface SimulationConfig {
  location: string;
  productSKUs: string[] | 'ALL';
  dateRange: DateRange;
  preset: string;
}

type PresetType = "quick" | "standard" | "quarter" | "full" | "custom";

const HARD_LIMIT = 91250;
const WARNING_THRESHOLD = 75000;

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
  validDates,
}: SimulationConfigDialogProps) => {
  const commonScope = useCommonScope();
  const [selectedPreset, setSelectedPreset] = useState<PresetType>("full");
  const [location, setLocation] = useState('');
  const [productSKUs, setProductSKUs] = useState<string[] | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<{
    recordCount: number;
    estimatedTime: string;
    warning?: string;
    isBlocked: boolean;
  } | null>(null);
  const [contiguousRange, setContiguousRange] = useState<ContiguousDateRange | null>(null);
  const [isLoadingRange, setIsLoadingRange] = useState(false);

  // Load contiguous date range when dialog opens or location changes
  useEffect(() => {
    if (!open) return;

    const loadContiguousRange = async () => {
      setIsLoadingRange(true);
      try {
        const range = await getContiguousValidDateRange(location || undefined, undefined);
        setContiguousRange(range);
        
        // Initialize location if not set
        if (!location && commonScope.locations.length > 0) {
          setLocation(commonScope.locations[0].code);
        }
        
        // Initialize date range to last 12 months of contiguous range
        if (range && !dateRange) {
          const end = new Date(range.endDate);
          const start = new Date(end);
          start.setMonth(start.getMonth() - 12);
          
          const rangeStart = new Date(range.startDate);
          const finalStart = start < rangeStart ? rangeStart : start;
          
          setDateRange({
            from: finalStart,
            to: end,
          });
        }

        // Default to 250 products if total products exceed 250
        if (commonScope.totalProducts > 250 && productSKUs === 'ALL') {
          const first250SKUs = commonScope.products.slice(0, 250).map(p => p.sku);
          setProductSKUs(first250SKUs);
        }
      } catch (error) {
        console.error("Error loading contiguous range:", error);
      } finally {
        setIsLoadingRange(false);
      }
    };

    loadContiguousRange();
  }, [open, location]);

  // Estimate record count based on valid days in contiguous range
  useEffect(() => {
    if (!open || !dateRange?.from || !dateRange?.to || !location || !contiguousRange) return;

    const estimateRecords = async () => {
      setEstimating(true);
      try {
        // Count only valid days within the selected range
        const fromStr = format(dateRange.from, 'yyyy-MM-dd');
        const toStr = format(dateRange.to, 'yyyy-MM-dd');
        
        let validDaysInRange = 0;
        for (const dateStr of contiguousRange.validDates) {
          if (dateStr >= fromStr && dateStr <= toStr) {
            validDaysInRange++;
          }
        }
        
        const productCount = productSKUs === 'ALL' ? commonScope.totalProducts : productSKUs.length;
        const recordCount = validDaysInRange * 1 * productCount;

        const estimatedSeconds = Math.ceil(recordCount / 1000);
        const estimatedTime =
          estimatedSeconds < 60
            ? `${estimatedSeconds}s`
            : `${Math.ceil(estimatedSeconds / 60)}min`;

        let warning: string | undefined;
        let isBlocked = false;
        
        if (recordCount > HARD_LIMIT) {
          warning = "BLOCKED: Exceeds processing limit";
          isBlocked = true;
        } else if (recordCount > WARNING_THRESHOLD) {
          warning = "Approaching limit. Consider reducing scope for optimal performance.";
        }

        setEstimate({ recordCount, estimatedTime, warning, isBlocked });
      } catch (error) {
        console.error("Error estimating records:", error);
        setEstimate({ recordCount: 0, estimatedTime: "Unknown", warning: "Could not estimate", isBlocked: false });
      } finally {
        setEstimating(false);
      }
    };

    estimateRecords();
  }, [open, location, productSKUs, dateRange, commonScope.totalProducts, contiguousRange]);

  const handlePresetChange = (preset: PresetType) => {
    setSelectedPreset(preset);
    
    if (preset !== "custom" && contiguousRange) {
      const endDate = new Date(contiguousRange.endDate);
      const startDate = new Date(endDate);
      const presetConfig = PRESETS[preset];
      startDate.setMonth(endDate.getMonth() - presetConfig.months);
    
      const rangeStart = new Date(contiguousRange.startDate);
      const finalStart = startDate < rangeStart ? rangeStart : startDate;
      
      setDateRange({ from: finalStart, to: endDate });
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

  if (commonScope.isLoading || isLoadingRange) {
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
                      <span className="text-muted-foreground">Contiguous Period:</span>
                      <p className="font-medium">
                        {contiguousRange ? (
                          <>
                            {format(contiguousRange.startDate, 'MMM d, yyyy')} → {format(contiguousRange.endDate, 'MMM d, yyyy')}
                          </>
                        ) : (
                          'No continuous data range'
                        )}
                      </p>
                      {contiguousRange && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {contiguousRange.validDaysCount}/{contiguousRange.totalDays} days ({contiguousRange.completeness}% complete)
                        </p>
                      )}
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
                <div className="space-y-2">
                  <CalendarComponent
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      setSelectedPreset("custom");
                    }}
                    numberOfMonths={2}
                    defaultMonth={contiguousRange ? new Date(contiguousRange.startDate) : undefined}
                    fromDate={contiguousRange ? new Date(contiguousRange.startDate) : undefined}
                    toDate={contiguousRange ? new Date(contiguousRange.endDate) : undefined}
                    disabled={(date) => {
                      if (!contiguousRange) return true;
                      const dateStr = format(date, 'yyyy-MM-dd');
                      return dateStr < contiguousRange.startDate || dateStr > contiguousRange.endDate;
                    }}
                    className="pointer-events-auto"
                  />
                  {contiguousRange && (
                    <p className="text-xs text-muted-foreground text-center px-3 pb-3">
                      {contiguousRange.validDaysCount} days available with {contiguousRange.completeness}% data completeness
                    </p>
                  )}
                </div>
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
              
              {/* Visual Formula Display */}
              <div className="mb-4 p-3 bg-background rounded-md border">
                <div className="text-sm font-mono text-center">
                  {estimating ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    <>
                      <span className="font-semibold">{getProductCount()}</span> SKUs × <span className="font-semibold">{getDayCount()}</span> days = <span className={cn(
                        "font-bold text-lg",
                        estimate?.isBlocked ? "text-destructive" : estimate?.recordCount && estimate.recordCount > WARNING_THRESHOLD ? "text-yellow-600 dark:text-yellow-500" : "text-primary"
                      )}>{estimate?.recordCount.toLocaleString() || "0"}</span> / {HARD_LIMIT.toLocaleString()}
                    </>
                  )}
                </div>
                
                {/* Progress Bar */}
                {!estimating && estimate && (
                  <div className="mt-3 space-y-1">
                    <Progress 
                      value={Math.min((estimate.recordCount / HARD_LIMIT) * 100, 100)} 
                      className={cn(
                        "h-2",
                        estimate.isBlocked && "[&>div]:bg-destructive",
                        !estimate.isBlocked && estimate.recordCount > WARNING_THRESHOLD && "[&>div]:bg-yellow-500"
                      )}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0</span>
                      <span className={cn(
                        "font-medium",
                        estimate.isBlocked && "text-destructive",
                        !estimate.isBlocked && estimate.recordCount > WARNING_THRESHOLD && "text-yellow-600 dark:text-yellow-500"
                      )}>
                        {Math.round((estimate.recordCount / HARD_LIMIT) * 100)}% of limit
                      </span>
                      <span>{HARD_LIMIT.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">SKUs:</span>
                  <p className="font-medium">{getProductCount()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <p className="font-medium">1 store (fixed)</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Days:</span>
                  <p className="font-medium">{getDayCount()}</p>
                </div>
                <div>
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

              {/* Blocking Alert */}
              {estimate?.isBlocked && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Scope Exceeds Processing Limit</AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    <p>
                      To ensure reliable processing and stay within your dataset limit (100,000 total records), 
                      simulations are capped at <strong>{HARD_LIMIT.toLocaleString()} records</strong>.
                    </p>
                    <p className="font-medium">Reduce your scope:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Reduce products to <strong>{Math.floor(HARD_LIMIT / getDayCount())}</strong> or fewer</li>
                      <li>Or reduce time period to <strong>{Math.floor(HARD_LIMIT / getProductCount())} days</strong> or fewer</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warning Alert */}
              {estimate?.warning && !estimate.isBlocked && (
                <Alert variant="default" className="mt-4 border-yellow-500/50 text-yellow-700 dark:text-yellow-500">
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
          <Button 
            onClick={handleConfirm} 
            disabled={!dateRange?.from || !dateRange?.to || !location || estimate?.isBlocked}
          >
            <Play className="mr-2 h-4 w-4" />
            Run Simulation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
