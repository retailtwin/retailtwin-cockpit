import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Package, Target, Mail } from "lucide-react";
import { Layout } from "@/components/Layout";

const Landing = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Optimize Your{" "}
            <span className="text-primary">Supply Chain Flow</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Maximize throughput and inventory turns using Theory of Constraints
            and Dynamic Buffer Management. Real-time insights, AI-powered
            recommendations, zero guesswork.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard">
              <Button size="lg" className="text-lg px-8 shadow-lg">
                See Live Demo
              </Button>
            </Link>
            <a href="mailto:contact@aifo.example.com">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                <Mail className="mr-2 h-5 w-5" />
                Talk to Retail Twin
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Increase Throughput</CardTitle>
              <CardDescription>
                Identify and eliminate constraints that limit your cash flow.
                Track Throughput Cash Margin and Missed Throughput Value in
                real-time.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-secondary" />
              </div>
              <CardTitle>Optimize Inventory Turns</CardTitle>
              <CardDescription>
                Reduce overstock and redundant inventory while maintaining
                service levels. See current vs. simulated turns side-by-side.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Minimize Stockouts</CardTitle>
              <CardDescription>
                Dynamic Buffer Management ensures the right products are
                available at the right time. Track stockout days and simulate
                improvements.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16">
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-none shadow-xl">
          <CardContent className="p-12 text-center space-y-6">
            <h2 className="text-3xl font-bold">
              Ready to Transform Your Supply Chain?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join leading retailers who use TOC and DBM to drive profitability
              and resilience.
            </p>
            <Link to="/dashboard">
              <Button size="lg" className="text-lg px-8 shadow-lg">
                Explore the Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
};

export default Landing;
