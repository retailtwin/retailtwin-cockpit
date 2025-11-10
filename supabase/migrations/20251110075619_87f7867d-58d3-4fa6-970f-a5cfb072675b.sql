-- Create blogs table for RetailTwin blog system
CREATE TABLE IF NOT EXISTS public.blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  author TEXT NOT NULL DEFAULT 'RetailTwin Labs',
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  featured_image_url TEXT,
  excerpt TEXT,
  content TEXT NOT NULL,
  tags TEXT[],
  is_published BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Public can read published blogs
CREATE POLICY "Anyone can read published blogs"
ON public.blogs FOR SELECT
USING (is_published = true);

-- Only admins can manage blogs
CREATE POLICY "Admins can insert blogs"
ON public.blogs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blogs"
ON public.blogs FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blogs"
ON public.blogs FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_blogs_slug ON public.blogs(slug);
CREATE INDEX idx_blogs_published_at ON public.blogs(published_at DESC) WHERE is_published = true;
CREATE INDEX idx_blogs_tags ON public.blogs USING GIN(tags);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_blog_updated_at
BEFORE UPDATE ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION update_blog_updated_at();