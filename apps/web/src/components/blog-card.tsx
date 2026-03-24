import { ArrowRight, Calendar } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { BlogPost } from "@/lib/notion";

interface BlogCardProps {
  post: BlogPost;
  featured?: boolean;
}

export function BlogCard({ post, featured = false }: BlogCardProps) {
  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  if (featured) {
    return (
      <article className="group col-span-full neo-border-thick neo-shadow bg-secondary hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">
        <Link to="/blog/$slug" params={{ slug: post.slug }} className="flex flex-col md:flex-row">
          {/* Cover Image */}
          <div className="relative aspect-video md:aspect-auto md:w-1/2 overflow-hidden border-b-2 md:border-b-0 md:border-r-2 border-foreground">
            {post.cover ? (
              <img
                src={post.cover}
                alt={post.title}
                className="w-full h-full object-cover border-none"
              />
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center bg-primary/10">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-16 h-16 border-none"
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col p-6 md:p-8">
            <span className="text-xs font-black uppercase tracking-wider text-primary">
              {post.category.name}
            </span>

            <h2 className="mt-3 text-2xl md:text-3xl font-black line-clamp-2 group-hover:text-primary transition-colors">
              {post.title}
            </h2>

            <p className="mt-3 text-muted-foreground line-clamp-3 flex-1">
              {post.description}
            </p>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {post.author.avatar ? (
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    width={36}
                    height={36}
                    className="neo-border"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center bg-primary text-primary-foreground text-sm font-black neo-border">
                    {post.author.name.charAt(0)}
                  </div>
                )}
                <div className="text-sm">
                  <span className="font-bold">{post.author.name}</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <time dateTime={post.publishedAt}>{formattedDate}</time>
                  </div>
                </div>
              </div>
              <span className="flex items-center gap-1 font-bold text-primary">
                Read <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="group neo-border-thick neo-shadow bg-secondary hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">
      <Link to="/blog/$slug" params={{ slug: post.slug }} className="flex flex-col h-full">
        {/* Compact header with category and date */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-foreground bg-background">
          <span className="text-xs font-black uppercase tracking-wider text-primary">
            {post.category.name}
          </span>
          <time
            dateTime={post.publishedAt}
            className="text-xs font-medium text-muted-foreground"
          >
            {formattedDate}
          </time>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-4">
          <h2 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h2>

          <p className="mt-2 text-sm text-muted-foreground line-clamp-2 flex-1">
            {post.description}
          </p>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              {post.author.avatar ? (
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  width={24}
                  height={24}
                  className="neo-border"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center bg-primary text-primary-foreground text-xs font-black neo-border">
                  {post.author.name.charAt(0)}
                </div>
              )}
              <span className="text-sm font-medium">{post.author.name}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </article>
  );
}
