import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface KPITableProps {
  data: {
    metric: string;
    current?: string | number;
    simulated?: string | number;
  }[];
  summaryMetrics: {
    locations: number;
    skus: number;
    days: number;
    skuLocDays: number;
    serviceLevel: string | number;
    serviceLevelSimulated: string | number;
  };
}

export const KPITable = ({ data, summaryMetrics }: KPITableProps) => {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Key Performance Indicators</CardTitle>
        <div className="grid grid-cols-3 gap-4 pt-4 text-sm">
          <div>
            <span className="text-muted-foreground">Locations:</span>{" "}
            <span className="font-semibold">{summaryMetrics.locations}</span>
          </div>
          <div>
            <span className="text-muted-foreground">SKUs:</span>{" "}
            <span className="font-semibold">{summaryMetrics.skus}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Days:</span>{" "}
            <span className="font-semibold">{summaryMetrics.days}</span>
          </div>
          <div>
            <span className="text-muted-foreground">SKU·Loc·Days:</span>{" "}
            <span className="font-semibold">{summaryMetrics.skuLocDays.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Service Level:</span>{" "}
            <span className="font-semibold">{summaryMetrics.serviceLevel}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Service Level (Sim):</span>{" "}
            <span className="font-semibold">{summaryMetrics.serviceLevelSimulated}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Metric</TableHead>
              <TableHead className="text-right font-semibold">Current</TableHead>
              <TableHead className="text-right font-semibold">Simulated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{row.metric}</TableCell>
                <TableCell className="text-right">{row.current ?? "—"}</TableCell>
                <TableCell className="text-right">{row.simulated ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
