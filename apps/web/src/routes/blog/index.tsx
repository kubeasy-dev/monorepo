import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useState } from "react";
import { BlogCard } from "@/components/blog-card";
import { blogListOptions } from "@/lib/query-options";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/blog/")({
  headers: () => ({
    "Cache-Control":
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
  }),
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(blogListOptions());
  },
  component: BlogListingPage,
});

function BlogListingPage() {
  const { data: posts } = useSuspenseQuery(blogListOptions());
  const totalPosts = posts.length;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Derive categories from post list
  const categories = [
    ...new Set(posts.map((p) => p.category?.name).filter(Boolean)),
  ] as string[];

  // Separate pinned and regular posts
  const pinnedPosts = posts.filter((p) => p.isPinned);
  const allRegularPosts = posts.filter((p) => !p.isPinned);

  // Apply category filter to regular posts
  const regularPosts = selectedCategory
    ? allRegularPosts.filter((p) => p.category?.name === selectedCategory)
    : allRegularPosts;

  // Also filter pinned posts if category is selected
  const displayedPinnedPosts = selectedCategory
    ? pinnedPosts.filter((p) => p.category?.name === selectedCategory)
    : pinnedPosts;

  const hasResults = displayedPinnedPosts.length > 0 || regularPosts.length > 0;

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

        {/* Category filter badges */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-6 sm:mb-8">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-3 py-1 text-xs font-black uppercase tracking-wider neo-border-thick cursor-pointer transition-all",
                selectedCategory === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-secondary",
              )}
            >
              All ({totalPosts})
            </button>
            {categories.map((cat) => {
              const count = posts.filter(
                (p) => p.category?.name === cat,
              ).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(selectedCategory === cat ? null : cat)
                  }
                  className={cn(
                    "px-3 py-1 text-xs font-black uppercase tracking-wider neo-border-thick cursor-pointer transition-all",
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-secondary",
                  )}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Blog grid */}
        {!hasResults ? (
          <div className="py-24 text-center">
            <h2 className="text-2xl font-black mb-4">No articles yet</h2>
            <p className="text-muted-foreground">
              Check back soon for new content!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Featured/Pinned posts */}
            {displayedPinnedPosts.map((post, index) => (
              <BlogCard
                key={post.id}
                post={post}
                featured={index === 0 && pinnedPosts.length === 1}
              />
            ))}

            {/* Regular posts */}
            {regularPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
