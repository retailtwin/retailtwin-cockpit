import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Target, Zap, Mail } from "lucide-react";
import { Layout } from "@/components/Layout";
import retailCycleImage from "@/assets/retail-cycle.png";

const Landing = () => {
  return (
    <Layout>
      {/* Hero Section with Background */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div 
          className="absolute inset-0 opacity-10 bg-center bg-no-repeat bg-cover"
          style={{ backgroundImage: `url(${retailCycleImage})` }}
        />
        
        <div className="relative container mx-auto px-6 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              Increase Throughput and Turns with{" "}
              <span className="text-primary">AI-guided inventory flow</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Tune your supply to Flow: find bottlenecks, automate good rules, and maximize cash velocity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/dashboard">
                <Button size="lg" className="text-lg px-10 shadow-lg">
                  View Demo
                </Button>
              </Link>
              <a href="mailto:contact@aifo.example.com">
                <Button size="lg" variant="secondary" className="text-lg px-10 shadow-lg">
                  <Mail className="mr-2 h-5 w-5" />
                  Talk to Retail Twin
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Set rules and apply them</CardTitle>
              <CardDescription className="text-base pt-2">
                Monitor compliance.
                Flag exceptions.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 text-accent" />
              </div>
              <CardTitle className="text-2xl">Free Cash</CardTitle>
              <CardDescription className="text-base pt-2">
                Run scenarios to find excess inventory and missed sales. 
                Get automated insights that release capital and improve flow.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Scale across your network</CardTitle>
              <CardDescription className="text-base pt-2">
                From single warehouse to retail networks. 
                Works where there is data.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Logos Strip */}
      {/* <section className="bg-muted/30 py-12">
        <div className="container mx-auto px-6">
          <p className="text-center text-sm text-muted-foreground mb-8 uppercase tracking-wider">
            Trusted by leading retailers, brands, and distributors
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-40">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 w-32 rounded-xl bg-muted-foreground/20 flex items-center justify-center"
              >
                <span className="text-xs text-muted-foreground">Logo {i}</span>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Footer */}
      <footer className="border-t bg-card mt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground">
                © 2025 AIFO — AI Flow Optimiser. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-8">
              <Link
                to="/about"
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                About
              </Link>
              <Link
                to="/report"
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Reports
              </Link>
              <Link
                to="/login"
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </Layout>
  );
};

export default Landing;
