import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeStatus } from "@/components/ui/badge-status";
import { AlertTriangle, Target, Zap, Mail, Layers, TrendingUp, Brain, Gauge, CheckCircle2, Package, Unlock, Eye, Bot, Award, ExternalLink, Box } from "lucide-react";
import { Layout } from "@/components/Layout";
import { FloatingContactButton } from "@/components/FloatingContactButton";
import { supabase } from "@/integrations/supabase/client";
import retailCycleImage from "@/assets/retail-cycle.png";
import retailTwinIcon from "@/assets/retail-twin-icon.png";
import dashboardPreview from "@/assets/dashboard-preview.png";
import archieChatPreview from "@/assets/archie-chat-preview.png";
import archieLogo from "@/assets/archie-logo.png";
import zefyrLogo from "@/assets/zefyr-logo.jpeg";

type ContentData = Record<string, { heading?: string; subheading?: string; body_text?: string }>;

const Landing = () => {
  const [content, setContent] = useState<ContentData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from("landing_content")
        .select("*");

      if (error) throw error;

      const contentMap: ContentData = {};
      data?.forEach((item) => {
        contentMap[item.section_key] = {
          heading: item.heading,
          subheading: item.subheading,
          body_text: item.body_text,
        };
      });
      setContent(contentMap);
    } catch (error) {
      console.error("Error loading landing content:", error);
    } finally {
      setLoading(false);
    }
  };

  const getContent = (key: string, field: "heading" | "subheading" | "body_text", fallback: string) => {
    return content[key]?.[field] || fallback;
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center min-h-screen">Loading...</div></Layout>;
  }

  return <Layout>
      <FloatingContactButton />
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

        <div className="relative container mx-auto px-6 py-24 md:py-32">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              {getContent("hero_new", "heading", "Supply Chain Intelligence That Actually Executes")}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {getContent("hero_new", "subheading", "20+ years of enterprise retail operations, now accessible to growing brands through AI agents. No complex software. No spreadsheets. Just disciplined execution.")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/login">
                <Button size="lg" className="text-lg px-10 shadow-lg">
                  Start with Replenishment
                </Button>
              </Link>
              <a href="mailto:hello@retailtwin.com?subject=Demo Request">
                <Button size="lg" variant="outline" className="text-lg px-10 shadow-lg">
                  Book a Demo
                </Button>
              </a>
            </div>
            <p className="text-sm text-muted-foreground italic max-w-2xl mx-auto">
              {getContent("hero_new", "body_text", "Proven at Foot Locker, adidas, and leading retailers. Now available to brands ready to scale.")}
            </p>
          </div>
        </div>
      </section>

      {/* Three-Pillar Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            {getContent("pillars_intro", "heading", "Complete Supply Chain Operations in Three Parts")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
            {getContent("pillars_intro", "body_text", "Replace spreadsheets and guesswork with AI agents that handle your operational, tactical, and strategic decisions.")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Pillar 1 - Replenishment */}
          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-l-green-500">
            <CardHeader>
              <BadgeStatus variant="available" className="mb-4">AVAILABLE NOW</BadgeStatus>
              <Box className="w-12 h-12 text-green-600 mb-4 opacity-40" strokeWidth={3} />
              <CardTitle className="text-2xl mb-2">
                {getContent("pillar1_main", "heading", "Replenishment")}
              </CardTitle>
              <p className="text-muted-foreground text-base mb-6">
                {getContent("pillar1_main", "body_text", "AI-driven order suggestions that maximize cash flow through higher inventory turns and better service levels.")}
              </p>
              <ul className="space-y-3 mb-6">
                {getContent("pillar1_benefits", "body_text", "Discipline that sticks to the rules|Real-time validation|Natural language interface|Focus on your core")
                  .split("|")
                  .map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
              </ul>
            </CardHeader>
            <CardContent>
              <Link to="/login" className="block">
                <Button className="w-full">Get Started</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Pillar 2 - Assortment */}
          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-l-amber-500">
            <CardHeader>
              <BadgeStatus variant="development" className="mb-4">IN DEVELOPMENT</BadgeStatus>
              <Box className="w-12 h-12 text-amber-600 mb-4 opacity-70" strokeWidth={2.5} />
              <CardTitle className="text-2xl mb-2">
                {getContent("pillar2_main", "heading", "Assortment Management")}
              </CardTitle>
              <p className="text-muted-foreground text-base mb-6">
                {getContent("pillar2_main", "body_text", "AI agents that optimize your product mix based on performance data and strategic goals.")}
              </p>
              <ul className="space-y-3 mb-6">
                {getContent("pillar2_benefits", "body_text", "Data-driven decisions|Planning automation|Performance optimization|Seamless integration")
                  .split("|")
                  .map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
              </ul>
            </CardHeader>
            <CardContent>
              <a href="mailto:hello@retailtwin.com?subject=Assortment Management Waitlist">
                <Button variant="outline" className="w-full">Join Waitlist</Button>
              </a>
            </CardContent>
          </Card>

          {/* Pillar 3 - Planning & OTB */}
          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-l-gray-400">
            <CardHeader>
              <BadgeStatus variant="coming-soon" className="mb-4">COMING 2025/2026</BadgeStatus>
              <Box className="w-12 h-12 text-gray-600 mb-4" strokeWidth={2} />
              <CardTitle className="text-2xl mb-2">
                {getContent("pillar3_main", "heading", "Planning & Open to Buy")}
              </CardTitle>
              <p className="text-muted-foreground text-base mb-6">
                {getContent("pillar3_main", "body_text", "Financial planning and Open to Buy management powered by AI.")}
              </p>
              <ul className="space-y-3 mb-6">
                {getContent("pillar3_benefits", "body_text", "Strategic planning|OTB automation|Scenario simulation|End-to-end visibility")
                  .split("|")
                  .map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
              </ul>
            </CardHeader>
            <CardContent>
              <a href="mailto:hello@retailtwin.com?subject=Planning Advisory Board">
                <Button variant="secondary" className="w-full">Join Advisory Board</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why AI Agents Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="flex justify-center mb-4">
              <img src={archieLogo} alt="Archie AI" className="h-24 w-24 object-contain opacity-90" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              {getContent("why_agents", "heading", "Why Agents Change Everything")}
            </h2>
            <div className="prose prose-lg mx-auto text-left">
              <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-line">
                {getContent("why_agents", "body_text", "After 15 years running Retailisation, I learned that even the best technology doesn't guarantee execution...")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Credibility Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            {getContent("credibility", "heading", "Built on 20+ Years of Enterprise Experience")}
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <p className="text-muted-foreground text-base">
                  Designed and ran retail systems for Foot Locker, adidas and others
                </p>
              </div>
            </CardHeader>
          </Card>

          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground text-base">
                    15 years operating Retailisation SaaS for replenishment, increasing sales and turns for global clients
                  </p>
                  <Link to="/case-study/dk-company" className="text-sm text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-4 h-4" />
                    View Case Study
                  </Link>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <p className="text-muted-foreground text-base">
                  First principles thinking, proven best practices (e.g., DBM for replenishment), configurable (e.g., lead-times), self-learning, executable output, metrics-driven
                </p>
              </div>
            </CardHeader>
          </Card>

          <Card className="shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <p className="text-muted-foreground text-base">
                  Now: Making enterprise-level supply chain intelligence accessible to growing brands through AI agents that use sound logic to improve service levels, throughput and turns
                </p>
              </div>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary/5 via-background to-accent/5 py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">
            {getContent("value_prop", "heading", "Buy Capability, Not Infrastructure")}
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <Bot className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="text-xl mb-3">
                  {getContent("value_prop1", "heading", "No Complex Software")}
                </CardTitle>
                <p className="text-muted-foreground text-base">
                  {getContent("value_prop1", "body_text", "Skip the expensive implementation. Our agents understand your business through conversation.")}
                </p>
              </CardHeader>
            </Card>
            <Card className="shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <Zap className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="text-xl mb-3">
                  {getContent("value_prop2", "heading", "Speed to Cash")}
                </CardTitle>
                <p className="text-muted-foreground text-base">
                  {getContent("value_prop2", "body_text", "Insights and recommendations within weeks.")}
                </p>
              </CardHeader>
            </Card>
            <Card className="shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <Gauge className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="text-xl mb-3">
                  {getContent("value_prop3", "heading", "Simulate → Automate")}
                </CardTitle>
                <p className="text-muted-foreground text-base">
                  {getContent("value_prop3", "body_text", "Understand each decision. Set the rules for flow. Archie executes with discipline.")}
                </p>
              </CardHeader>
            </Card>
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
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">What You Get</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Using your data and your rules, we launch an intuitive cockpit from where you monitor the flow. Watch as you move toward your goal: increasing sales and turns through better service levels, with human insights in simple language.
              </p>
            </div>

            {/* Visual Showcase Section */}
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-none bg-gradient-to-br from-card to-card/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl mb-4">Dashboard</CardTitle>
                  <CardDescription className="text-base leading-relaxed mb-6">
                    Monitor your inventory flow with real-time KPIs, analytics, and actionable insights all in one
                    place.
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
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Consultancy</h2>
            </div>

            {/* Announcement Card */}
            <Card className="shadow-xl border-none bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <CardTitle className="text-2xl mb-6">Joining Zefyr Solutions</CardTitle>
                <CardDescription className="text-base leading-relaxed space-y-4">
                  <p>
                    I'm excited to announce that I've joined Zefyr Solutions as Director - Responsive Retail Supply
                    Chains, based in Amsterdam, The Netherlands.
                  </p>
                  <p>
                    I bring 30+ years of retail leadership across EMEA and a proven record as a SaaS founder. Having led
                    retailing teams at scale and founded technology solutions that enable smarter, faster decisions, I
                    offer strategic and operational domain experience, connecting supply flows to
                    retail, helping businesses unlock value and free cash.
                  </p>
                  <p>
                    I'm thrilled to join Zefyr as the team extends beyond their already deep expertise in Footwear and
                    Apparel product management, product creation, sourcing, logistics, and innovation with my
                    market-facing, retail-driven perspective.
                  </p>
                  <p>
                    Contact me to learn how I can help strengthen the link between your supply chain and your retail
                    success.
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
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Partnership</h2>
            </div>

            {/* Partnership Card */}
            <Card className="shadow-xl border-none bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <CardTitle className="text-2xl mb-6">Retail Twin Ventures</CardTitle>
                <CardDescription className="text-base leading-relaxed space-y-4">
                  <p>
                    Beyond consultancy, I partner directly with select businesses that share our vision for transforming
                    retail supply chains.
                  </p>
                  <p>
                    Through Retail Twin Ventures, I offer strategic partnerships as a stakeholder or advisor, bringing
                    deep operational expertise in assortment optimization and replenishment strategies. This model
                    aligns incentives—your growth is our growth.
                  </p>
                  <p>
                    I work alongside forward-thinking brands and retailers ready to unlock hidden value in their supply
                    chain, combining proven methodologies with skin in the game. If you're building something
                    exceptional and looking for a partner who understands both the strategic and tactical dimensions of
                    retail flow, let's explore what we can achieve together.
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
              <p className="text-sm text-muted-foreground">© 2025 RetailTwin Labs. All rights reserved.</p>
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