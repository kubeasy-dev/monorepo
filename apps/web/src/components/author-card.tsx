import { Github, Twitter } from "lucide-react";
import type { Author } from "@/lib/notion";

interface AuthorCardProps {
  author: Author;
  showBio?: boolean;
}

export function AuthorCard({ author, showBio = true }: AuthorCardProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 neo-border-thick neo-shadow p-4 sm:p-6 bg-secondary">
      {/* Avatar */}
      {author.avatar ? (
        <img
          src={author.avatar}
          alt={author.name}
          width={80}
          height={80}
          className="rounded-none neo-border-thick flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20"
        />
      ) : (
        <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center bg-primary text-primary-foreground text-2xl sm:text-3xl font-black neo-border-thick flex-shrink-0">
          {author.name.charAt(0)}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0 text-center sm:text-left">
        <h3 className="font-black text-lg sm:text-xl mt-0.5">{author.name}</h3>
        {showBio && author.bio && (
          <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {author.bio}
          </p>
        )}

        {/* Social links */}
        {(author.twitter || author.github) && (
          <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3">
            {author.twitter && (
              <a
                href={author.twitter}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${author.name} on Twitter`}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-background neo-border font-bold text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Twitter className="h-4 w-4" />
                <span>Twitter</span>
              </a>
            )}
            {author.github && (
              <a
                href={author.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${author.name} on GitHub`}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-background neo-border font-bold text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Github className="h-4 w-4" />
                <span>GitHub</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
