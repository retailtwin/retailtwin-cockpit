import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, TrendingUp, TrendingDown, Target, CheckCircle2 } from "lucide-react";
import dkCaseStudyScreenshot from "@/assets/dk-case-study-screenshot.png";
import dkCaseStudyOriginal from "@/assets/dk-case-study-original.png";

const CaseStudyDK = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-accent/5 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Archived Marketing Material Header */}
            <div className="relative border-2 border-amber-500/30 rounded-lg p-6 bg-amber-50/30 dark:bg-amber-950/10">
              <div className="absolute top-4 right-4">
                <ExternalLink className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-2">
                <div className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 text-xs font-semibold rounded-full">
                  ARCHIVED MARKETING MATERIAL
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Multi-Brand Fashion Retailer Case Study
                </h1>
                <p className="text-sm text-muted-foreground">
                  Originally published at{" "}
                  <a
                    href="https://www.retailisation.com/insights/how-dk-company-increased-sales-while-decreasing-inventory"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-600 dark:hover:text-amber-400"
                  >
                    retailisation.com
                  </a>
                  {" "}• January 2023
                </p>
              </div>
            </div>

            {/* Original Article Preview */}
            <Card className="overflow-hidden shadow-2xl border-2 border-primary/10">
              <div className="bg-gradient-to-br from-secondary/30 to-accent/30 p-4 border-b-2 border-primary/20">
                <p className="text-sm font-semibold text-center flex items-center justify-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Original Marketing Material from Retailisation.com (2023)
                </p>
              </div>
              <CardContent className="p-0">
                <div className="relative">
                  <img 
                    src={dkCaseStudyOriginal} 
                    alt="Original DK Company case study article from Retailisation website"
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none"></div>
                </div>
              </CardContent>
            </Card>

            {/* TL;DR Summary */}
            <Card className="border-2 border-primary/20 shadow-xl">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Target className="h-6 w-6 text-primary" />
                  TL;DR
                </h2>
                <div className="space-y-4">
                  <p className="text-lg leading-relaxed">
                    <strong>What was achieved:</strong> A multi-brand fashion group with 250+ stores increased sales by <span className="text-green-600 dark:text-green-400 font-bold">46%</span> while reducing inventory by <span className="text-blue-600 dark:text-blue-400 font-bold">15%</span> in just 5 weeks.
                  </p>
                  <p className="text-lg leading-relaxed">
                    <strong>How:</strong> By implementing Retailisation's Dynamic Buffer Management (DBM) methodology - a disciplined approach that enforces business rules (lead times, pack sizes, minimums), identifies exactly where stock is short or redundant in cash terms, and provides executable order suggestions based on actual demand patterns.
                  </p>
                  <p className="text-lg leading-relaxed">
                    <strong>The key:</strong> Moving from manual, inconsistent processes to automated, data-driven replenishment that responds to real demand - increasing availability where it matters while eliminating excess inventory.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-green-500/30 bg-gradient-to-br from-green-50/50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
                  <div className="text-5xl font-bold text-green-700 dark:text-green-400 mb-2">+46%</div>
                  <p className="text-green-800 dark:text-green-300 font-semibold">Sales Increase</p>
                  <p className="text-sm text-green-700/70 dark:text-green-400/70 mt-2">In 5 weeks</p>
                </CardContent>
              </Card>

              <Card className="border-blue-500/30 bg-gradient-to-br from-blue-50/50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
                <CardContent className="p-6 text-center">
                  <TrendingDown className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                  <div className="text-5xl font-bold text-blue-700 dark:text-blue-400 mb-2">-15%</div>
                  <p className="text-blue-800 dark:text-blue-300 font-semibold">Inventory Decrease</p>
                  <p className="text-sm text-blue-700/70 dark:text-blue-400/70 mt-2">Less working capital</p>
                </CardContent>
              </Card>

              <Card className="border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="h-12 w-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
                  <div className="text-5xl font-bold text-purple-700 dark:text-purple-400 mb-2">-84%</div>
                  <p className="text-purple-800 dark:text-purple-300 font-semibold">Lost Sales Reduction</p>
                  <p className="text-sm text-purple-700/70 dark:text-purple-400/70 mt-2">Better availability</p>
                </CardContent>
              </Card>
            </div>

            {/* Additional Metrics */}
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-6">Additional Results</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div>
                      <p className="font-semibold text-lg">+38% sales per SKU</p>
                      <p className="text-sm text-muted-foreground">Better product flow to where consumers buy</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div>
                      <p className="font-semibold text-lg">+66% test vs control stores</p>
                      <p className="text-sm text-muted-foreground">Test stores significantly outperformed control</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div>
                      <p className="font-semibold text-lg">Stockouts reduced to fraction</p>
                      <p className="text-sm text-muted-foreground">Increased opportunity to convert to cash</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div>
                      <p className="font-semibold text-lg">Fully automated replenishment</p>
                      <p className="text-sm text-muted-foreground">From cumbersome manual process to daily automation</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* The Methodology */}
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-6">The Retailisation Methodology</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-lg mb-2">The Challenge</h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Suboptimal replenishment processes - manual and cumbersome</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Overstock in some areas, stockouts in others</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Inadequate sales numbers and lost revenue opportunities</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Lack of data intelligence and actionable insights</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2">The Approach: 5-Week Proof of Concept</h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Selected representative stores, divided into test and control groups</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Test stores: Retailisation's DBM methodology with automated daily/weekly reordering</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Control stores: Business as usual to measure scientific impact</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Enforced business rules: lead times, pack sizes, minimums, delivery frequency</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2">What Made It Work</h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span><strong>Discipline:</strong> Consistent application of proven best practices</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span><strong>Transparency:</strong> Clear visibility into every decision and its cash impact</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span><strong>Data-driven:</strong> Decisions based on actual demand patterns, not gut feel</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span><strong>Executable:</strong> Actionable order suggestions that buyers could implement immediately</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Quote */}
            <Card className="border-primary/20 shadow-lg">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="text-6xl text-primary/20 leading-none">"</div>
                  <blockquote className="text-lg italic leading-relaxed -mt-8">
                    As a company with 25 brands and more than 16,500 selling points, forecasting and planning is more important than ever. The complexity is enormous and we need automated systems to support us in decision making and to run the daily planning routines. Retailisation plays a big part in the future of our company, helping it remain a relevant fashion partner. Their data-driven solution lets us meet high demands from key accounts, with automated re-ordering on a daily/weekly basis.
                  </blockquote>
                  <p className="text-sm font-semibold pt-4">
                    — Thomas Fjord Pedersen, IT Planning Manager
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Multi-brand fashion group with 250+ stores
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Connection to Archie */}
            <Card className="border-2 border-primary/30 shadow-xl bg-gradient-to-br from-secondary/10 to-accent/10">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-4">From SaaS Platform to AI Agent</h3>
                <p className="text-lg leading-relaxed mb-4">
                  This same proven DBM methodology - validated over 15 years operating Retailisation SaaS for global retail clients - now powers <strong>Archie</strong>, our AI agent for replenishment.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  The difference? What required dedicated software, onboarding, and training now operates through an AI agent that understands your business through standard API calls, validates your rules, and executes with the same unwavering discipline - bringing enterprise-level supply chain intelligence to growing brands.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CaseStudyDK;
