import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Target, Zap, Mail, Layers, TrendingUp, Brain, Gauge } from "lucide-react";
import { Layout } from "@/components/Layout";
import retailCycleImage from "@/assets/retail-cycle.png";
import retailTwinIcon from "@/assets/retail-twin-icon.png";
import dashboardPreview from "@/assets/dashboard-preview.png";
import archieChatPreview from "@/assets/archie-chat-preview.png";
import archieLogo from "@/assets/archie-logo.png";
const Landing = () => {
  return <Layout>
      {/* Hero Section with Background */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute inset-0 opacity-10 bg-center bg-no-repeat bg-cover" style={{
        backgroundImage: `url(${retailCycleImage})`
      }} />
        
        <div className="relative container mx-auto px-6 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              AI that Governs Flow,{" "}
              <span className="text-primary">Not Just Automates It</span>
            </h1>
            <div className="flex items-start gap-4 max-w-3xl mx-auto">
              <img src={archieLogo} alt="Archie Logo" className="w-16 h-auto mt-1 mb-auto flex-shrink-0" />
              <p className="text-xl text-muted-foreground text-left">
                Deployed in your environment, Archie enforces and improves the rules and metrics that drive supply performance — ensuring better decisions, with none of the SaaS complexity.
              </p>
            </div>
            <p className="text-base text-muted-foreground max-w-4xl mx-auto leading-relaxed mt-6">In distribution, flow runs on rules — not forecasts. The Theory of Constraints shows that responsiveness comes from managing buffers, not predicting demand. Archie applies these flow rules — ordering to the buffer, keeping lead times short and reliable, and tracking 'speed to cash' — to sustain service levels and turns - without the SaaS complexity.</p>
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
              <CardTitle className="text-2xl">Rule-driven workflows for allocation & replenishment</CardTitle>
              <CardDescription className="text-base pt-2">
                Good rules enhance flow with better service levels and higher turns.
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
                Run scenarios with different rules to find excess inventory and extra sales. 
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
                From single warehouse to retail networks and Vendor Managed Inventory (VMI). Works where your customers come to buy, when there is data.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* About Retail Twin Labs Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20">
        <div className="absolute inset-0 opacity-5 bg-center bg-no-repeat bg-cover" style={{
        backgroundImage: `url(${retailCycleImage})`
      }} />
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
                Flow. Sustained by Simplicity
              </p>
            </div>

            {/* Company Introduction */}
            <Card className="shadow-xl border-none bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <CardDescription className="text-base leading-relaxed">At Retail Twin Labs, we combine decades of experience in Footwear, Apparel and Sporting Goods, with deep SaaS knowledge and AI, to deliver key insights and workflows that simply work. Your data, your rules, your tools.</CardDescription>
              </CardHeader>
            </Card>

            {/* Two Column Cards */}
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-card to-card/50">
                <CardHeader>
                  <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                    <TrendingUp className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="text-xl mb-4">From the founder: Lessons from Retailisation </CardTitle>
                  <CardDescription className="text-base leading-relaxed">At Retailisation, my previous company, I learned that effective order automation is only possible when internal rules and metrics strictly govern flow. Hence at Retail Twin Labs, we focus on these rules and metrics, with AI agents that understand and explain lead-times and minimum order quantities, and their impacts on flow.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-card to-card/50">
                <CardHeader>
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl mb-4">AI That Understands Your Business</CardTitle>
                  <CardDescription className="text-base leading-relaxed">Our AI agents don't just process data—they understand the nuances of your supply chain. Lead-times, batch constraints—we model the real-world factors that impact flow, so you can make decisions with confidence.</CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Learn More Button */}
            <div className="flex justify-center mt-12">
              <Link to="/about">
                <Button size="lg" className="text-lg px-10 shadow-lg">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Your Cockpit Section */}
      <section className="relative overflow-hidden py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto space-y-12">
            {/* Section Header */}
            <div className="text-center space-y-6">
              <div className="flex justify-center mb-4">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Gauge className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Your Cockpit
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Using your data and your rules, we build intuitive cockpits from where you control the flow. Simple steps guide you toward the goal: increasing sales and turns through better service levels, real insights, and a much quicker supply chain.
              </p>
            </div>

            {/* Visual Showcase Section */}
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-card to-card/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl mb-4">Dashboard View</CardTitle>
                  <CardDescription className="text-base leading-relaxed mb-6">
                    Monitor your inventory flow with real-time KPIs, analytics, and actionable insights all in one place.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="relative w-full aspect-video overflow-hidden rounded-t-lg">
                    <img src={dashboardPreview} alt="Dashboard interface showing inventory analytics and KPIs" className="w-full h-full object-cover object-top shadow-lg" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-card to-card/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl mb-4">Archie AI Assistant</CardTitle>
                  <CardDescription className="text-base leading-relaxed mb-6">
                    Get intelligent recommendations and explanations about your supply chain directly from Archie.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="relative w-full aspect-video overflow-hidden rounded-t-lg">
                    <img src={archieChatPreview} alt="Archie AI chat interface providing supply chain insights" className="w-full h-full object-cover object-top shadow-lg" />
                  </div>
                </CardContent>
              </Card>
            </div>
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
              <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                About
              </Link>
              <Link to="/blogs" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Blog
              </Link>
              <Link to="/impressum" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Impressum
              </Link>
              <Link to="/privacy-policy" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </Layout>;
};
export default Landing;