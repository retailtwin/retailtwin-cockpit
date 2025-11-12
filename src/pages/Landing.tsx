import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Target, Zap, Mail, Layers, TrendingUp, Brain, Gauge } from "lucide-react";
import { Layout } from "@/components/Layout";
import { FloatingContactButton } from "@/components/FloatingContactButton";
import retailCycleImage from "@/assets/retail-cycle.png";
import retailTwinIcon from "@/assets/retail-twin-icon.png";
import dashboardPreview from "@/assets/dashboard-preview.png";
import archieChatPreview from "@/assets/archie-chat-preview.png";
import archieLogo from "@/assets/archie-logo.png";
import zefyrLogo from "@/assets/zefyr-logo.jpeg";
const Landing = () => {
  return <Layout>
      <FloatingContactButton />
      {/* Hero Section with Background */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute inset-0 opacity-10 bg-center bg-no-repeat bg-cover" style={{
        backgroundImage: `url(${retailCycleImage})`
      }} />
        
        <div className="relative container mx-auto px-6 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">Proven Logic, Supercharged<span className="text-primary">Not Just Automate</span>
            </h1>
            <div className="flex items-start gap-4 max-w-3xl mx-auto">
              <img src={archieLogo} alt="Archie Logo" className="w-16 h-auto mt-1 mb-auto flex-shrink-0" />
              <p className="text-xl text-muted-foreground text-left">At Retail Twin Labs, we use the same TOC-based logic that transformed global retail distribution and VMI operations — now enhanced with AI for real-time insights, education, and transparency.</p>
            </div>
            <p className="text-base text-muted-foreground max-w-4xl mx-auto leading-relaxed mt-6">Many consumer goods products (NOOS, Always Available, and key seasonal lines in Footwear and Apparel) — should run on rules, not forecasts. We learned from SaaS, and merged proven supply logic with AI — turning rules into reliable decisions.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/login">
                <Button size="lg" className="text-lg px-10 shadow-lg">
                  Login to Dashboard
                </Button>
              </Link>
              <a href="mailto:hello@retailtwin.com">
                <Button size="lg" variant="secondary" className="text-lg px-10 shadow-lg">
                  <Mail className="mr-2 h-5 w-5" />
                  Talk to Us
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
              <CardDescription className="text-base pt-2">Control the rules (e.g., lead-times, minimums) and enhance throughput and profits from better service levels and higher turns.</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 text-accent" />
              </div>
              <CardTitle className="text-2xl">Free Cash</CardTitle>
              <CardDescription className="text-base pt-2">Run 'what-if'scenarios with different rules to find free cash from excess inventory and extra sales. Get automated insights that release capital and improve flow.</CardDescription>
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
                <CardDescription className="text-base leading-relaxed">We combine decades of experience in merchandise planning and distribution for Footwear, Apparel and Sporting Goods with deep SaaS knowledge and AI, to deliver critical insights and simple workflow automation. Your data, your rules, your tools.</CardDescription>
              </CardHeader>
            </Card>

            {/* Two Column Cards */}
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-card to-card/50">
                <CardHeader>
                  <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                    <TrendingUp className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="text-xl mb-4">From the founder: Jasper Zeelenberg</CardTitle>
                  <CardDescription className="text-base leading-relaxed">Order automation is only as effective as the internal rules and metrics that govern flow. At Retail Twin Labs, we help you focus on these rules and metrics for good automation, and use AI agents to explain how lead-times and minimum order quantities impact flow.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-card to-card/50">
                <CardHeader>
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl mb-4">AI That Understands Your Business</CardTitle>
                  <CardDescription className="text-base leading-relaxed">Our AI agents don't just process data—they understand the nuances of your supply chain down to the level of SKU and Location. Order frequency, pack sizes—we model the real-world factors that impact flow, so you can automate decisions with confidence.</CardDescription>
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
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Using your data and your rules, we build intuitive cockpits from where you control the flow. Simple steps guide you toward the goal: increasing sales and turns through better service levels, human insights in natural language, and a much quicker supply chain.</p>
            </div>

            {/* Visual Showcase Section */}
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-card to-card/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl mb-4">Dashboard</CardTitle>
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
                  <CardTitle className="text-xl mb-4">Archie, your AI Assistant</CardTitle>
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

      {/* Consultancy Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary/5 via-background to-accent/5 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto space-y-12">
            {/* Section Header */}
            <div className="text-center space-y-6">
              <div className="flex justify-center mb-4">
                <img src={zefyrLogo} alt="Zefyr Solutions" className="h-24 w-auto" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Consultancy
              </h2>
            </div>

            {/* Announcement Card */}
            <Card className="shadow-xl border-none bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <CardTitle className="text-2xl mb-6">Joining Zefyr Solutions</CardTitle>
                <CardDescription className="text-base leading-relaxed space-y-4">
                  <p>
                    I'm excited to announce that I've joined Zefyr Solutions as Director - Responsive Retail Supply Chains, based in Amsterdam, The Netherlands.
                  </p>
                  <p>I bring 30+ years of retail leadership across EMEA and a proven record as a SaaS founder. Having led retailing teams at scale and founded technology solutions that enable smarter, faster decisions, I offer a unique combination of strategic insight and domain experience. Connecting supply flows to retail, helping businesses unlock value and free cash.</p>
                  <p>I'm thrilled to join Zefyr as the team extends beyond their already deep expertise in Footwear and Apparel product management, product creation, sourcing, logistics, and innovation with my market-facing, retail-driven perspective.</p>
                  <p>
                    Contact me to learn how I can help strengthen the link between your supply chain and your retail success.
                  </p>
                </CardDescription>
              </CardHeader>
            </Card>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <a href="https://www.zefyrsolutions.com/contact" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="text-lg px-10 shadow-lg">
                  Visit Zefyr Solutions
                </Button>
              </a>
              <a href="mailto:hello@retailtwin.com">
                <Button size="lg" variant="secondary" className="text-lg px-10 shadow-lg">
                  <Mail className="mr-2 h-5 w-5" />
                  Talk to Us
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Section */}
      <section className="relative overflow-hidden py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto space-y-12">
            {/* Section Header */}
            <div className="text-center space-y-6">
              <div className="flex justify-center mb-4">
                <img src={retailTwinIcon} alt="Retail Twin Ventures" className="h-20 w-20" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Partnership
              </h2>
            </div>

            {/* Partnership Card */}
            <Card className="shadow-xl border-none bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <CardTitle className="text-2xl mb-6">Retail Twin Ventures</CardTitle>
                <CardDescription className="text-base leading-relaxed space-y-4">
                  <p>
                    Beyond consultancy, I partner directly with select businesses that share our vision for transforming retail supply chains.
                  </p>
                  <p>
                    Through Retail Twin Ventures, I offer strategic partnerships as a stakeholder or advisor, bringing deep operational expertise in assortment optimization and replenishment strategies. This model aligns incentives—your growth is our growth.
                  </p>
                  <p>
                    I work alongside forward-thinking brands and retailers ready to unlock hidden value in their supply chain, combining proven methodologies with skin in the game. If you're building something exceptional and looking for a partner who understands both the strategic and tactical dimensions of retail flow, let's explore what we can achieve together.
                  </p>
                </CardDescription>
              </CardHeader>
            </Card>

            {/* CTA Button */}
            <div className="flex justify-center pt-4">
              <a href="mailto:hello@retailtwin.com">
                <Button size="lg" className="text-lg px-10 shadow-lg">
                  <Mail className="mr-2 h-5 w-5" />
                  Explore Partnership
                </Button>
              </a>
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