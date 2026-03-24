import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TableOfContentsItem } from "@/lib/notion";

interface TableOfContentsClientProps {
  headings: TableOfContentsItem[];
  collapsible?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function TableOfContentsClient({
  headings,
  collapsible = false,
}: TableOfContentsClientProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(!collapsible);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        rootMargin: "-80px 0px -80% 0px",
        threshold: 0,
      },
    );

    // Observe all heading elements
    for (const heading of headings) {
      const element = document.getElementById(slugify(heading.text));
      if (element) {
        observer.observe(element);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [headings]);

  if (headings.length === 0) return null;

  const headerContent = (
    <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2">
      <span className="inline-block w-3 sm:w-4 h-1 bg-primary" />
      On this page
      {collapsible && (
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      )}
    </h2>
  );

  return (
    <nav
      className="neo-border-thick shadow sm:neo-shadow bg-secondary p-4 sm:p-6 flex flex-col max-h-[calc(100vh-8rem)]"
      aria-label="Table of contents"
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left shrink-0"
        >
          {headerContent}
        </button>
      ) : (
        <div className="mb-4 shrink-0">{headerContent}</div>
      )}

      {isOpen && (
        <ul
          className={cn(
            "space-y-1 text-xs sm:text-sm overflow-y-auto min-h-0",
            collapsible && "mt-4",
          )}
        >
          {headings.map((heading) => {
            const id = slugify(heading.text);
            const isActive = activeId === id;
            return (
              <li key={heading.id}>
                <a
                  href={`#${id}`}
                  onClick={() => collapsible && setIsOpen(false)}
                  className={cn(
                    "block py-1 px-2 font-medium transition-all border-l-2",
                    heading.level === 2 && "ml-2",
                    heading.level === 3 && "ml-4",
                    isActive
                      ? "border-primary text-foreground font-bold"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground",
                  )}
                >
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
