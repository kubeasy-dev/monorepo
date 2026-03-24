import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { BlogPost } from "@/lib/notion";

interface RelatedPostsProps {
  posts: BlogPost[];
  title?: string;
}

export function RelatedPosts({
  posts,
  title = "Related Articles",
}: RelatedPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-lg sm:text-xl font-black mb-6 sm:mb-8 flex items-center gap-2">
        <span className="inline-block w-6 sm:w-8 h-1 bg-primary" />
        {title}
      </h2>
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            to="/blog/$slug"
            params={{ slug: post.slug }}
            className="group flex flex-col neo-border-thick shadow sm:neo-shadow overflow-hidden bg-secondary hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-muted border-b-2 border-foreground">
              {post.cover ? (
                <img
                  src={post.cover}
                  alt={post.title}
                  className="w-full h-full object-cover border-none"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="w-16 h-16 border-none"
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {post.category.name}
              </span>
              <h3 className="mt-2 font-bold text-sm sm:text-base line-clamp-2 group-hover:text-primary transition-colors">
                {post.title}
              </h3>
              <div className="mt-auto pt-3 sm:pt-4 flex items-center text-sm font-bold text-primary">
                <span>Read more</span>
                <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
