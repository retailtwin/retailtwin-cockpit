import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "lucide-react";
import { Location, Product } from "@/lib/supabase-helpers";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  locations: Location[];
  products: Product[];
  selectedLocation: string;
  selectedProduct: string;
  dateRange?: DateRange;
  dataDateRange?: {min: Date, max: Date} | null;
  onLocationChange: (value: string) => void;
  onProductChange: (value: string) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export const FilterBar = ({
  locations,
  products,
  selectedLocation,
  selectedProduct,
  dateRange,
  dataDateRange,
  onLocationChange,
  onProductChange,
  onDateRangeChange,
}: FilterBarProps) => {
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-card rounded-2xl shadow-md border">
      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          Location
        </label>
        <Select value={selectedLocation} onValueChange={onLocationChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="ALL">All Locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.code} value={location.code}>
                {location.name || location.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          Product
        </label>
        <Select value={selectedProduct} onValueChange={onProductChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="ALL">All Products</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.sku} value={product.sku}>
                {product.name || product.sku}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          Date Range
        </label>
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
              ) : dataDateRange ? (
                <span className="text-foreground">
                  {format(dataDateRange.min, "MMM d, yyyy")} - {format(dataDateRange.max, "MMM d, yyyy")}
                </span>
              ) : (
                <span>Select date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="range"
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
              defaultMonth={dataDateRange?.min || dateRange?.from}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
