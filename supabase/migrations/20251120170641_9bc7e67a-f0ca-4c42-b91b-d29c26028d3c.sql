-- Insert new landing content for three-pillar SCAAAS platform positioning

-- Hero Section (New Positioning)
INSERT INTO landing_content (section_key, heading, subheading, body_text) VALUES
('hero_new', 'Supply Chain Intelligence That Actually Executes', '20+ years of enterprise retail operations, now accessible to growing brands through AI agents. No complex software. No spreadsheets. Just disciplined execution.', 'Proven at Foot Locker, adidas, and leading retailers. Now available to brands ready to scale.'),

-- Three-Pillar Introduction
('pillars_intro', 'Complete Supply Chain Operations in Three Parts', NULL, 'Replace spreadsheets and guesswork with AI agents that handle your operational, tactical, and strategic decisions. Built on workflows proven at billion-dollar retailers, now accessible to growing brands.'),

-- Pillar 1 - Replenishment (Available Now)
('pillar1_main', 'Replenishment Remastered', 'Operational Excellence - Short-term decisions', 'AI-driven order suggestions that maximize cash flow through higher inventory turns and better service levels. Archie analyzes your data, validates business rules, and quantifies exactly where stocks are short or redundant - in cash terms.'),
('pillar1_benefits', NULL, NULL, 'Discipline that sticks to the rules|Real-time validation of lead times, packs, minimums|Natural language interface for continuous learning|Focus on your core: what gets replenished (or should be)'),

-- Pillar 2 - Assortment (In Development)
('pillar2_main', 'Assortment Management', 'Tactical Planning - Mid-term decisions', 'AI agents that optimize your product mix based on performance data, market trends, and strategic goals. Replace complex spreadsheet planning with intelligent recommendations.'),
('pillar2_benefits', NULL, NULL, 'Data-driven assortment decisions|Merchandise planning automation|Performance-based optimization|Seamless integration with replenishment flow'),

-- Pillar 3 - Planning & OTB (Coming 2025/2026)
('pillar3_main', 'Planning & Open to Buy', 'Strategic Planning - Long-term decisions', 'Financial planning and Open to Buy management powered by AI. Set strategic constraints while agents handle the complex calculations and scenario modeling.'),
('pillar3_benefits', NULL, NULL, 'Strategic financial planning|OTB automation|Scenario simulation|End-to-end visibility'),

-- Why AI Agents Section
('why_agents', 'Why Agents Change Everything', NULL, 'After 15 years running Retailisation, I learned that even the best technology doesn''t guarantee execution. Clients had irregular deliveries, long lead times, complex batching rules - and the discipline to follow best practices was inconsistent.

Archie, our AI agent, doesn''t just provide insights - it validates rules are followed, learns from your business context through natural language, and maintains the discipline that humans struggle with in day-to-day operations. This is how decades of domain experience gets packed into an AI that actually executes.'),

-- Credibility Section
('credibility', 'Built on 20+ Years of Enterprise Experience', NULL, NULL),
('credibility_timeline', NULL, NULL, 'Designed and ran retail systems for Foschini Group, Alshaya, Foot Locker Europe, adidas Retail Region Europe|15 years operating Retailisation SaaS (proven case studies like DK Company: increased sales while decreasing inventory)|Consistent thread: First principles thinking, executable workflows, metrics-driven optimization|Now: Making enterprise-level supply chain intelligence accessible to growing brands'),

-- Value Proposition Section
('value_prop', 'Buy Capability, Not Infrastructure', NULL, NULL),
('value_prop1', 'No Complex Software', NULL, 'Skip the expensive implementation. Our agents understand your business through conversation.'),
('value_prop2', 'No Long-term Lock-in', NULL, 'Month-to-month engagement. Success is measured in cash generated and time saved.'),
('value_prop3', 'Transparency, Not Black Boxes', NULL, 'Understand every decision. Set the rules for flow - lead times, packs, minimums, delivery frequency. Archie executes with discipline.');