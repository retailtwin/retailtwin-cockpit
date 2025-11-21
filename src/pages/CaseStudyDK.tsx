import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

const CaseStudyDK = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-accent/5 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Case Study: DK Company
              </h1>
              <p className="text-xl text-muted-foreground">
                Archived from Retailisation SaaS
              </p>
            </div>

            {/* Archived Article Notice */}
            <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                  <ExternalLink className="h-5 w-5" />
                  Archived Marketing Material
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  This case study is preserved from the original Retailisation website and represents proven results
                  from our SaaS platform. The original article may no longer be available at{" "}
                  <a
                    href="https://www.retailisation.com/insights/how-dk-company-increased-sales-while-decreasing-inventory"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-600 dark:hover:text-amber-300"
                  >
                    retailisation.com
                  </a>
                </p>
              </CardContent>
            </Card>

            {/* Case Study Content */}
            <Card className="shadow-xl">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold">How DK Company Increased Sales While Decreasing Inventory</h2>
                  
                  <div className="prose prose-lg dark:prose-invert max-w-none">
                    <h3 className="text-2xl font-semibold mt-8 mb-4">The Challenge</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      DK Company, a leading fashion retailer, faced a common retail paradox: how to grow sales while 
                      reducing inventory investment. Traditional approaches forced a tradeoff between service levels 
                      and inventory efficiency.
                    </p>

                    <h3 className="text-2xl font-semibold mt-8 mb-4">The Solution</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Using Retailisation's Dynamic Buffer Management (DBM) methodology, DK Company implemented 
                      disciplined replenishment strategies that:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                      <li>Validated and enforced business rules (lead times, pack sizes, minimums)</li>
                      <li>Identified exactly where stock was short or redundant - in cash terms</li>
                      <li>Provided actionable order suggestions based on actual demand patterns</li>
                      <li>Maintained consistent execution discipline through systematic processes</li>
                    </ul>

                    <h3 className="text-2xl font-semibold mt-8 mb-4">The Results</h3>
                    <div className="grid md:grid-cols-2 gap-6 my-8">
                      <div className="p-6 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20">
                        <div className="text-4xl font-bold text-green-700 dark:text-green-400 mb-2">↑ Sales</div>
                        <p className="text-green-800 dark:text-green-300">Increased revenue through better availability</p>
                      </div>
                      <div className="p-6 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
                        <div className="text-4xl font-bold text-blue-700 dark:text-blue-400 mb-2">↓ Inventory</div>
                        <p className="text-blue-800 dark:text-blue-300">Decreased working capital requirements</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      By focusing inventory where it mattered most - items with actual demand - DK Company simultaneously 
                      improved customer service levels and freed up cash previously tied up in slow-moving stock.
                    </p>

                    <h3 className="text-2xl font-semibold mt-8 mb-4">Key Success Factors</h3>
                    <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                      <li><strong>Discipline:</strong> Consistent application of proven best practices</li>
                      <li><strong>Transparency:</strong> Clear visibility into every replenishment decision</li>
                      <li><strong>Data-driven:</strong> Decisions based on actual demand patterns, not gut feel</li>
                      <li><strong>Executable:</strong> Actionable recommendations that buyers could implement immediately</li>
                    </ul>

                    <div className="mt-12 p-6 rounded-lg bg-gradient-to-br from-secondary/20 to-accent/20">
                      <p className="text-lg font-medium mb-4">
                        This same proven methodology now powers Archie, our AI agent for replenishment - bringing 
                        enterprise-level supply chain intelligence to growing brands.
                      </p>
                      <p className="text-muted-foreground">
                        The difference? What required dedicated software and training now operates through AI that 
                        understands your business, validates your rules, and executes with unwavering discipline.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CaseStudyDK;
