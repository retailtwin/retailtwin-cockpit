import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Target, Zap, Mail, Layers, TrendingUp, Brain, Gauge } from "lucide-react";
import { Layout } from "@/components/Layout";
import retailCycleImage from "@/assets/retail-cycle.png";
import retailTwinIcon from "@/assets/retail-twin-icon.png";

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
              <Link to="/login">
                <Button size="lg" className="text-lg px-10 shadow-lg">
                  Login to Dashboard
                </Button>
              </Link>
              <a href="mailto:hello@retailtwin.com">
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

      {/* About Retail Twin Labs Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20">
        <div 
          className="absolute inset-0 opacity-5 bg-center bg-no-repeat bg-cover"
          style={{ backgroundImage: `url(${retailCycleImage})` }}
        />
        <div className="relative container mx-auto px-6">
          <div className="max-w-5xl mx-auto space-y-12">
            {/* Section Header */}
            <div className="text-center space-y-6">
              <div className="flex justify-center mb-4">
                <img src={retailTwinIcon} alt="Retail Twin Labs" className="h-20 w-20" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                About Retail Twin Labs
              </h2>
              <p className="text-2xl text-primary font-semibold">
                Sustained by Simplicity
              </p>
            </div>

            {/* Company Introduction */}
            <Card className="shadow-xl border-none bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <CardDescription className="text-base leading-relaxed">
                  At Retail Twin Labs, we combine deep SaaS knowledge with cutting-edge AI and decades of experience in merchandise planning and distribution to deliver workflows that simply work.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Two Column Cards */}
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-card to-card/50">
                <CardHeader>
                  <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                    <TrendingUp className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="text-xl mb-4">Lessons from Retailisation</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    At Retailisation, our previous SaaS company, we learned that success requires good automation, but is also critically dependent on the internal rules and metrics that govern flow. At Retail Twin Labs, we focus on these rules and metrics, with AI agents that understand and explain things like lead-times and minimum order quantities and their impacts on flow.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-card to-card/50">
                <CardHeader>
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl mb-4">AI That Understands Your Business</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Our AI agents don't just process data—they understand the nuances of your supply chain. Lead-times, minimum order quantities, batch constraints—we model the real-world factors that impact flow, so you can make decisions with confidence.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Full Width Card */}
            <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-primary/10 to-secondary/10">
              <CardHeader>
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Gauge className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-4">Your Control Center</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Using your data and your rules, we build simple cockpits from where you control the flow. Humanly designed steps guide you toward the goal: increasing sales and turns through better service levels, real insights, and a much quicker supply chain.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
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
                © 2025 RetailTwin Labs. All rights reserved.
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
                to="/blogs"
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Blog
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
