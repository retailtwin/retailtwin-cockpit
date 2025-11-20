-- Create landing_content table for CMS
CREATE TABLE public.landing_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  heading TEXT,
  subheading TEXT,
  body_text TEXT,
  image_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read landing content
CREATE POLICY "Anyone can view landing content"
  ON public.landing_content
  FOR SELECT
  USING (true);

-- Only admins can manage landing content
CREATE POLICY "Admins can insert landing content"
  ON public.landing_content
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update landing content"
  ON public.landing_content
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete landing content"
  ON public.landing_content
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Seed with existing content from Landing page
INSERT INTO public.landing_content (section_key, heading, subheading, body_text) VALUES
  ('hero_title', 'Replenishment, Remastered', NULL, NULL),
  ('hero_subtitle', NULL, NULL, 'The same replenishment logic that already transformed global retail distribution and VMI operations — enhanced with AI for human insights, education, and transparency.'),
  ('hero_description', NULL, NULL, 'Many consumer goods supply chains (NOOS, Always Available, and even key seasonal lines in Footwear and Apparel) should run on rules, not forecasts. Founded on TOC, we learned from SaaS, and merged proven supply logic with AI — turning your rules into reliable, transparent replenishment automation, and maximum throughput.'),
  ('benefit_1_title', 'Rule-driven workflows for allocation & replenishment', NULL, 'Enhance throughput and profits from better service levels and higher turns.'),
  ('benefit_2_title', 'Free Cash', NULL, 'Reduce inventory levels without sacrificing sales. Focus capital where it matters most.'),
  ('benefit_3_title', 'Scale Confidently', NULL, 'From 10 to 10,000 SKUs. From one location to a global network. Our system grows with you.'),
  ('about_heading', 'About Retail Twin Labs', NULL, NULL),
  ('about_body', NULL, NULL, 'Retail Twin Labs is a technology company that specializes in supply chain optimization for consumer goods retailers. Our flagship product, the Dynamic Buffer Management (DBM) system, helps retailers optimize their inventory levels, improve service levels, and increase profitability.');
