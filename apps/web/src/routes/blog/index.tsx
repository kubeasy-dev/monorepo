import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import type { BlogPost } from "@/lib/notion";
import { getBlogPosts } from "@/lib/notion";

export const Route = createFileRoute("/blog/")({
  headers: () => ({
    "Cache-Control":
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
  }),
  loader: async () => {
    // Throws on Notion API failure — causes SSG build failure (locked decision)
    const posts = await getBlogPosts();
    return { posts };
  },
  component: BlogListingPage,
});

function BlogCard({ post }: { post: BlogPost }) {
  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group block p-6 rounded-xl neo-border-thick neo-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:neo-shadow-xl transition-all bg-card"
    >
      {post.cover && (
        <div className="mb-4 overflow-hidden rounded-lg aspect-video">
          <img
            src={post.cover}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-1 text-xs font-bold bg-primary/10 text-primary neo-border rounded">
            {post.category.name}
          </span>
          {post.isPinned && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-bold bg-secondary neo-border rounded">
              Pinned
            </span>
          )}
        </div>

        <h2 className="text-xl font-black group-hover:text-primary transition-colors leading-tight">
          {post.title}
        </h2>

        {post.description && (
          <p className="text-sm text-muted-foreground font-medium line-clamp-2">
            {post.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pt-2">
          <div className="flex items-center gap-2">
            {post.author.avatar ? (
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black">
                {post.author.name.charAt(0)}
              </div>
            )}
            <span>{post.author.name}</span>
          </div>
          <time dateTime={post.publishedAt}>{formattedDate}</time>
        </div>
      </div>
    </Link>
  );
}

function BlogListingPage() {
  const { posts } = Route.useLoaderData();
  const totalPosts = posts.length;

  return (
    <div className="w-full overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        {/* Hero Section */}
        <div className="mb-8 sm:mb-12 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-secondary text-foreground neo-border-thick font-bold shadow sm:neo-shadow text-sm">
            <FileText className="h-4 w-4" />
            <span>{totalPosts} Articles</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-balance">
            Kubeasy Blog
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed font-bold">
            Deep dives into Kubernetes, DevOps practices, and cloud-native
            development. Learn from real-world experiences and best practices.
          </p>
        </div>

        {/* Blog grid */}
        {posts.length === 0 ? (
          <div className="py-24 text-center">
            <h2 className="text-2xl font-black mb-4">No articles yet</h2>
            <p className="text-muted-foreground">
              Check back soon for new content!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
