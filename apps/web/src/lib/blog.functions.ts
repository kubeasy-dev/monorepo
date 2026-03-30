import { createServerFn } from "@tanstack/react-start";
import type { BlogPost, BlogPostWithContent } from "./notion";
import {
  getBlogPosts,
  getBlogPostWithContent,
  getRelatedBlogPosts,
} from "./notion";

export const fetchBlogPostsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<BlogPost[]> => {
    return getBlogPosts();
  },
);

export const fetchBlogPostDetailFn = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(
    async ({
      data: slug,
    }): Promise<{ post: BlogPostWithContent; relatedPosts: BlogPost[] }> => {
      const [post, allPosts] = await Promise.all([
        getBlogPostWithContent(slug),
        getBlogPosts(),
      ]);
      if (!post) throw new Error(`Blog post not found: ${slug}`);
      const relatedPosts = await getRelatedBlogPosts(post, 3, allPosts);
      return { post, relatedPosts };
    },
  );
