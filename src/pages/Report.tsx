import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const Report = () => {
  return (
    <Layout>
      <div className="container mx-auto px-6 py-16">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Reports</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Printable analytics and insights
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Report generation coming soon.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Future reports will include:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>• Executive summary of KPIs</li>
              <li>• Buffer status by location & product</li>
              <li>• TOC constraint analysis</li>
              <li>• Scenario comparison exports</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Report;
