import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, ChevronLeft, Clock } from "lucide-react";
import type { NotionBlock, RichTextItem } from "@/lib/notion";
import { getBlogPostWithContent } from "@/lib/notion";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getBlogPostWithContent(params.slug);
    if (!post) throw new Error(`Blog post not found: ${params.slug}`);
    return { post };
  },
  component: BlogArticlePage,
});

// ---- Rich text renderer ----

function renderRichText(items: RichTextItem[]): React.ReactNode {
  return items.map((item, i) => {
    let content: React.ReactNode = item.plain_text;

    if (item.annotations.bold) content = <strong key={i}>{content}</strong>;
    if (item.annotations.italic) content = <em key={i}>{content}</em>;
    if (item.annotations.strikethrough) content = <s key={i}>{content}</s>;
    if (item.annotations.underline) content = <u key={i}>{content}</u>;
    if (item.annotations.code)
      content = (
        <code
          key={i}
          className="bg-muted px-1 py-0.5 rounded text-sm font-mono"
        >
          {content}
        </code>
      );

    if (item.text?.link?.url) {
      content = (
        <a
          key={i}
          href={item.text.link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:no-underline"
        >
          {content}
        </a>
      );
    }

    return <span key={i}>{content}</span>;
  });
}

// ---- Block renderer ----

function BlockRenderer({ blocks }: { blocks: NotionBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <BlockItem key={block.id} block={block} />
      ))}
    </div>
  );
}

function BlockItem({ block }: { block: NotionBlock }) {
  switch (block.type) {
    case "paragraph":
      if (!block.paragraph) return null;
      return (
        <p className="text-base leading-relaxed font-medium">
          {renderRichText(block.paragraph.rich_text)}
        </p>
      );

    case "heading_1":
      if (!block.heading_1) return null;
      return (
        <h2 className="text-3xl font-black mt-8 mb-4" id={block.id}>
          {renderRichText(block.heading_1.rich_text)}
        </h2>
      );

    case "heading_2":
      if (!block.heading_2) return null;
      return (
        <h3 className="text-2xl font-black mt-6 mb-3" id={block.id}>
          {renderRichText(block.heading_2.rich_text)}
        </h3>
      );

    case "heading_3":
      if (!block.heading_3) return null;
      return (
        <h4 className="text-xl font-black mt-4 mb-2" id={block.id}>
          {renderRichText(block.heading_3.rich_text)}
        </h4>
      );

    case "bulleted_list_item":
      if (!block.bulleted_list_item) return null;
      return (
        <li className="ml-6 list-disc">
          {renderRichText(block.bulleted_list_item.rich_text)}
          {block.children && <BlockRenderer blocks={block.children} />}
        </li>
      );

    case "numbered_list_item":
      if (!block.numbered_list_item) return null;
      return (
        <li className="ml-6 list-decimal">
          {renderRichText(block.numbered_list_item.rich_text)}
          {block.children && <BlockRenderer blocks={block.children} />}
        </li>
      );

    case "code":
      if (!block.code) return null;
      return (
        <pre className="bg-foreground text-background p-4 rounded-xl neo-border overflow-x-auto">
          <code className="text-sm font-mono">
            {block.code.rich_text.map((t) => t.plain_text).join("")}
          </code>
        </pre>
      );

    case "quote":
      if (!block.quote) return null;
      return (
        <blockquote className="border-l-4 border-primary pl-4 italic font-medium text-muted-foreground">
          {renderRichText(block.quote.rich_text)}
        </blockquote>
      );

    case "callout":
      if (!block.callout) return null;
      return (
        <div className="flex gap-3 p-4 rounded-lg bg-secondary neo-border">
          {block.callout.icon?.type === "emoji" && (
            <span className="text-xl">{block.callout.icon.emoji}</span>
          )}
          <div>{renderRichText(block.callout.rich_text)}</div>
        </div>
      );

    case "divider":
      return <hr className="border-border my-8" />;

    case "image": {
      if (!block.image) return null;
      const imageUrl =
        block.image.type === "file"
          ? block.image.file?.url
          : block.image.external?.url;
      if (!imageUrl) return null;
      const caption =
        block.image.caption?.map((t) => t.plain_text).join("") ?? "";
      return (
        <figure className="my-6">
          <img
            src={imageUrl}
            alt={caption}
            className="w-full rounded-lg neo-border"
          />
          {caption && (
            <figcaption className="text-center text-sm text-muted-foreground mt-2 font-medium">
              {caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case "to_do":
      if (!block.to_do) return null;
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={block.to_do.checked}
            readOnly
            className="h-4 w-4"
          />
          <span
            className={
              block.to_do.checked ? "line-through text-muted-foreground" : ""
            }
          >
            {renderRichText(block.to_do.rich_text)}
          </span>
        </div>
      );

    default:
      return null;
  }
}

// ---- Page component ----

function BlogArticlePage() {
  const { post } = Route.useLoaderData();

  const wordCount = post.blocks
    .filter((b) => b.type === "paragraph" && b.paragraph)
    .reduce((acc, b) => {
      const text =
        b.paragraph?.rich_text.map((t) => t.plain_text).join("") || "";
      return acc + text.split(/\s+/).length;
    }, 0);
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="w-full overflow-x-clip">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        {/* Back link */}
        <div className="mb-6 sm:mb-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 font-bold text-muted-foreground hover:text-foreground transition-colors text-sm sm:text-base"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Blog
          </Link>
        </div>

        {/* Article header */}
        <header className="mb-8 sm:mb-12 text-center">
          <div className="inline-block mb-4 sm:mb-6">
            <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-primary-foreground neo-border-thick font-bold shadow sm:neo-shadow text-xs sm:text-sm">
              {post.category.name}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-balance leading-tight mb-4 sm:mb-6">
            {post.title}
          </h1>

          {post.description && (
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-6 sm:mb-8">
              {post.description}
            </p>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm font-medium">
            <div className="flex items-center gap-3">
              {post.author.avatar ? (
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="rounded-full neo-border w-8 h-8 sm:w-10 sm:h-10"
                />
              ) : (
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-black neo-border text-sm sm:text-base">
                  {post.author.name.charAt(0)}
                </div>
              )}
              <span className="font-bold">{post.author.name}</span>
            </div>

            <span className="hidden sm:inline text-muted-foreground">•</span>

            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <time dateTime={post.publishedAt}>{formattedDate}</time>
              </div>

              <span className="text-muted-foreground">•</span>

              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{readingTime} min read</span>
              </div>
            </div>
          </div>

          {post.tags.length > 0 && (
            <div className="mt-4 sm:mt-6 flex flex-wrap justify-center gap-1.5 sm:gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs sm:text-sm font-bold text-muted-foreground bg-secondary neo-border px-2 sm:px-3 py-0.5 sm:py-1"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Article content */}
        <div className="max-w-none prose-lg">
          <BlockRenderer blocks={post.blocks} />
        </div>

        {/* Author bio */}
        <div className="mt-12 p-6 bg-secondary neo-border-thick rounded-xl">
          <h2 className="text-lg font-black mb-4 flex items-center gap-2">
            <span className="inline-block w-6 sm:w-8 h-1 bg-primary" />
            Written by
          </h2>
          <div className="flex items-start gap-4">
            {post.author.avatar ? (
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-16 h-16 rounded-full neo-border"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground font-black neo-border text-xl">
                {post.author.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-black text-lg">{post.author.name}</p>
              {post.author.bio && (
                <p className="text-muted-foreground font-medium text-sm mt-1">
                  {post.author.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
