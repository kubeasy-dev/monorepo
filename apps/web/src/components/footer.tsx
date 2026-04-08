import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { Github, Twitter } from "lucide-react";
import { siteConfig } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="py-12 px-4 mt-8 bg-secondary">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-xl font-black">{siteConfig.name}</span>
            </Link>
            <p className="text-sm font-medium">{siteConfig.description}</p>
          </div>

          <div>
            <h3 className="font-black mb-4">Product</h3>
            <ul className="space-y-2 text-sm font-medium">
              <li>
                <a
                  href="/challenges"
                  className="hover:text-primary transition-colors"
                >
                  Challenges
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.links.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href={`${siteConfig.links.github}/kubeasy-cli`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  CLI Tool
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-black mb-4">Community</h3>
            <ul className="space-y-2 text-sm font-medium">
              <li>
                <a
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Discord
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Contribute
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-black mb-4">Legal</h3>
            <ul className="space-y-2 text-sm font-medium">
              <li>
                <a
                  href="/privacy"
                  className="hover:text-primary transition-colors"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  className="hover:text-primary transition-colors"
                >
                  Terms
                </a>
              </li>
              <li>
                <a
                  href={`${siteConfig.links.github}/${siteConfig.github.repo}/blob/main/LICENSE`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  License
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm font-bold">
            © 2025 {siteConfig.name}. Open source under Apache License 2.0.
          </p>
          <div className="flex items-center gap-4">
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="hover:text-primary transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href={siteConfig.links.twitter}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
              className="hover:text-primary transition-colors"
            >
              <Twitter className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
