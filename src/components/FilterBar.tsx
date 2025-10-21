import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { Location, Product } from "@/lib/supabase-helpers";

interface FilterBarProps {
  locations: Location[];
  products: Product[];
  selectedLocation: string;
  selectedProduct: string;
  onLocationChange: (value: string) => void;
  onProductChange: (value: string) => void;
}

export const FilterBar = ({
  locations,
  products,
  selectedLocation,
  selectedProduct,
  onLocationChange,
  onProductChange,
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
        <Button
          variant="outline"
          disabled
          className="w-full justify-start text-left font-normal opacity-50 cursor-not-allowed"
        >
          <Calendar className="mr-2 h-4 w-4" />
          <span>Select date range</span>
        </Button>
      </div>
    </div>
  );
};
