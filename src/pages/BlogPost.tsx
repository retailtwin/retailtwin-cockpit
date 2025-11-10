import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Clock, ArrowLeft, Share2 } from "lucide-react";
import { format } from "date-fns";
import DOMPurify from "dompurify";

interface Blog {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  author: string;
  published_at: string;
  featured_image_url?: string | null;
  tags?: string[] | null;
  content: string;
  view_count: number;
}

const calculateReadTime = (content: string): number => {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (slug) {
      fetchBlog();
    }
  }, [slug]);

  const fetchBlog = async () => {
    try {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error) throw error;

      setBlog(data);
      
      // Increment view count
      await supabase
        .from("blogs")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", data.id);
    } catch (error: any) {
      toast({
        title: "Error loading article",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: blog?.title,
        text: blog?.subtitle || blog?.excerpt || "",
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Article link copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!blog) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-8">The article you're looking for doesn't exist.</p>
          <Link to="/blogs">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const readTime = calculateReadTime(blog.content);
  
  // Sanitize blog content to prevent XSS attacks
  const sanitizedContent = DOMPurify.sanitize(blog.content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class'],
    ALLOW_DATA_ATTR: false,
  });

  return (
    <Layout>
      <article className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link to="/blogs">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>
          </Link>

          {/* Featured Image */}
          {blog.featured_image_url && (
            <div className="aspect-video w-full overflow-hidden rounded-lg mb-8">
              <img
                src={blog.featured_image_url}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Header */}
          <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              {blog.title}
            </h1>
            {blog.subtitle && (
              <p className="text-xl text-muted-foreground mb-6">{blog.subtitle}</p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
              <span className="font-medium text-foreground">{blog.author}</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(blog.published_at), 'MMMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{readTime} min read</span>
              </div>
            </div>

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {blog.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Share Button */}
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </header>

          {/* Content - Now sanitized with DOMPurify */}
          <div 
            className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t">
            <Link to="/blogs">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Articles
              </Button>
            </Link>
          </footer>
        </div>
      </article>
    </Layout>
  );
}