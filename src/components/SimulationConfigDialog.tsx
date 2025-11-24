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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Play, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Location, Product } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SimulationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: SimulationConfig) => void;
  locations: Location[];
  products: Product[];
  dataDateRange: { min: Date; max: Date } | null;
  currentFilters: {
    location: string;
    product: string;
    dateRange?: DateRange;
  };
}

export interface SimulationConfig {
  location: string;
  product: string;
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
  locations,
  products,
  dataDateRange,
  currentFilters,
}: SimulationConfigDialogProps) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetType>("standard");
  const [location, setLocation] = useState(currentFilters.location);
  const [product, setProduct] = useState(currentFilters.product);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(currentFilters.dateRange);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<{
    recordCount: number;
    estimatedTime: string;
    warning?: string;
  } | null>(null);

  // Set smart defaults based on data date range
  useEffect(() => {
    if (open && dataDateRange) {
      // Calculate smart defaults based on preset
      const endDate = dataDateRange.max;
      const startDate = new Date(endDate);
      
      if (selectedPreset !== "custom") {
        const preset = PRESETS[selectedPreset];
        startDate.setMonth(endDate.getMonth() - preset.months);
        
        // Ensure we don't go before data start date
        if (startDate < dataDateRange.min) {
          startDate.setTime(dataDateRange.min.getTime());
        }
      }

      setDateRange({ from: startDate, to: endDate });
    }
  }, [open, selectedPreset, dataDateRange]);

  // Estimate record count when config changes
  useEffect(() => {
    if (!open || !dateRange?.from || !dateRange?.to) return;

    const estimateRecords = async () => {
      setEstimating(true);
      try {
        // Calculate days in range
        const diffTime = Math.abs(dateRange.to!.getTime() - dateRange.from!.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        // Calculate approximate record count
        const locationCount = location === "ALL" ? locations.length : 1;
        const productCount = product === "ALL" ? products.length : 1;
        const recordCount = days * locationCount * productCount;

        const estimatedSeconds = Math.ceil(recordCount / 1000); // ~1K records/second
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
  }, [open, location, product, dateRange, locations.length, products.length]);

  const handlePresetChange = (preset: PresetType) => {
    setSelectedPreset(preset);
  };

  const handleConfirm = () => {
    if (!dateRange?.from || !dateRange?.to) return;

    onConfirm({
      location,
      product,
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

  const getLocationCount = () => (location === "ALL" ? locations.length : 1);
  const getProductCount = () => (product === "ALL" ? products.length : 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Simulation Scope</DialogTitle>
          <DialogDescription>
            Select the data scope for your DBM simulation. Start with a smaller scope for faster testing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Presets */}
          <div className="space-y-2">
            <Label>Scope Preset</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {(Object.keys(PRESETS) as PresetType[]).map((preset) => (
                <Button
                  key={preset}
                  variant={selectedPreset === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetChange(preset)}
                  className="flex flex-col h-auto py-2"
                >
                  <span className="font-medium">{PRESETS[preset].name}</span>
                  <span className="text-xs opacity-70">{PRESETS[preset].description}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
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
                  defaultMonth={dataDateRange?.min || dateRange?.from}
                  disabled={(date) =>
                    dataDateRange
                      ? date < dataDateRange.min || date > dataDateRange.max
                      : false
                  }
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Locations ({locations.length})</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.code} value={loc.code}>
                    {loc.name || loc.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product */}
          <div className="space-y-2">
            <Label>Product (SKU)</Label>
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Products ({products.length})</SelectItem>
                {products.map((prod) => (
                  <SelectItem key={prod.sku} value={prod.sku}>
                    {prod.name || prod.sku}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview Panel */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Simulation Preview
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Locations:</span>
                  <p className="font-medium">{getLocationCount()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Products:</span>
                  <p className="font-medium">{getProductCount()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Days:</span>
                  <p className="font-medium">{getDayCount()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Estimated Records:</span>
                  {estimating ? (
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs">Calculating...</span>
                    </div>
                  ) : (
                    <p className="font-medium">{estimate?.recordCount.toLocaleString() || "—"}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Estimated Processing Time:</span>
                  {estimating ? (
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs">Calculating...</span>
                    </div>
                  ) : (
                    <p className="font-medium">{estimate?.estimatedTime || "—"}</p>
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
          <Button onClick={handleConfirm} disabled={!dateRange?.from || !dateRange?.to}>
            <Play className="mr-2 h-4 w-4" />
            Run Simulation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
