import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, Layers } from "lucide-react";
const About = () => {
  return <Layout>
      <div className="container mx-auto px-6 py-16 max-w-5xl">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">About Retail Twin Labs</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Decades of retail experience inside. Powered by AI. Guided by Archie.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Lightbulb className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Our Approach</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">We help retailers find and remove bottlenecks that limit cash flow and throughput.</p>
                <p className="text-muted-foreground">​;kawudgf
                <strong>Theory of Constraints (TOC)</strong> learnings, 
                  and many years of experience in Footwear, Apparel and SaaS to focus on maximizing{" "}
                  <strong>Throughput</strong> (revenue minus truly variable
                  costs) while minimizing inventory and operating expenses.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <div className="h-12 w-12 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>Dynamic Buffer Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  <strong>DBM (TOC)</strong> is a pull-based replenishment system that
                  flourishes with short lead-times, and frequent movements of small, if any batches. 
                  Buffers adjust dynamically on consumption and other input; reducing the dependency on a forecasts.
                </p>
                <p className="text-muted-foreground">
                  This ensures high service levels with high Turns,
                  reducing both stockouts and overstock simultaneously.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                <Layers className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>What We Measure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Core KPIs</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>
                      <strong>Throughput Cash Margin:</strong> Revenue minus
                      truly variable costs
                    </li>
                    <li>
                      <strong>Turns:</strong> How quickly inventory converts to
                      cash
                    </li>
                    <li>
                      <strong>Missed Throughput Value (MTV):</strong> Revenue
                      lost to stockouts
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Buffer Health</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>
                      <strong>Stockout Days:</strong> Time spent with zero
                      inventory
                    </li>
                    <li>
                      <strong>Overstock Days:</strong> Excess days beyond buffer
                      targets
                    </li>
                    <li>
                      <strong>Redundant Inventory Value (RIV):</strong> Capital
                      tied up unnecessarily
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-none shadow-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">Consultancy</h2>
              <p className="text-muted-foreground mb-4">I partner with clients on an interim or project basis to implement metrics and workflows that deliver measurable improvements in throughput, turns, and service levels.</p>
              
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>;
};
export default About;