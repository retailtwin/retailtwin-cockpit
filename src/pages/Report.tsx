import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { InventoryZonesChart } from "@/components/InventoryZonesChart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Report = () => {
  const [locations, setLocations] = useState<Array<{ code: string; name: string }>>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date("2023-01-01"),
    to: new Date("2023-12-31"),
  });
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase.rpc("get_locations");
      if (error) {
        console.error("Error fetching locations:", error);
        toast.error("Failed to load locations");
      } else {
        setLocations([{ code: "ALL", name: "All Locations" }, ...(data || [])]);
      }
    };
    fetchLocations();
  }, []);

  // Fetch inventory zones data
  useEffect(() => {
    const fetchInventoryZones = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.rpc("get_inventory_zones_report", {
        p_location_code: selectedLocation,
        p_start_date: format(dateRange.from, "yyyy-MM-dd"),
        p_end_date: format(dateRange.to, "yyyy-MM-dd"),
      });

      if (error) {
        console.error("Error fetching inventory zones:", error);
        toast.error("Failed to load inventory data");
        setInventoryData([]);
      } else {
        setInventoryData(data || []);
      }
      setIsLoading(false);
    };

    fetchInventoryZones();
  }, [selectedLocation, dateRange]);

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Inventory Zones Report</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Detailed view of all SKUs ranked by throughput
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.code} value={loc.code}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-[280px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd, yyyy")} -{" "}
                            {format(dateRange.to, "MMM dd, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, yyyy")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ from: range.from, to: range.to });
                        }
                      }}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
        </Card>

        <InventoryZonesChart data={inventoryData} isLoading={isLoading} />
      </div>
    </Layout>
  );
};

export default Report;
