import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

interface BlogCardProps {
  blog: {
    slug: string;
    title: string;
    subtitle?: string | null;
    excerpt?: string | null;
    author: string;
    published_at: string;
    featured_image_url?: string | null;
    tags?: string[] | null;
    content: string;
  };
}

const calculateReadTime = (content: string): number => {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};

export const BlogCard = ({ blog }: BlogCardProps) => {
  const readTime = calculateReadTime(blog.content);

  return (
    <Link to={`/blogs/${blog.slug}`}>
      <Card className="h-full transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
        {blog.featured_image_url && (
          <div className="aspect-video w-full overflow-hidden rounded-t-lg">
            <img
              src={blog.featured_image_url}
              alt={blog.title}
              className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
            />
          </div>
        )}
        <CardHeader>
          <h3 className="text-2xl font-bold tracking-tight line-clamp-2 hover:text-primary transition-colors">
            {blog.title}
          </h3>
          {blog.subtitle && (
            <p className="text-muted-foreground line-clamp-2">{blog.subtitle}</p>
          )}
        </CardHeader>
        <CardContent>
          {blog.excerpt && (
            <p className="text-muted-foreground line-clamp-3 mb-4">{blog.excerpt}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(blog.published_at), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{readTime} min read</span>
            </div>
          </div>
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {blog.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <span className="text-sm text-primary hover:underline">Read More →</span>
        </CardFooter>
      </Card>
    </Link>
  );
};
