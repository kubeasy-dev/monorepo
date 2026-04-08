import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { type NextRequest, NextResponse } from "next/server";

// Middleware sees the full URL path including the basePath (/docs)
// Rewrite from /docs/{path} to /docs/llms.mdx/docs/{path} so Next.js can
// strip the basePath and route to app/llms.mdx/docs/[[...slug]]/route.ts
const { rewrite: rewriteLLM } = rewritePath(
  "/docs{/*path}",
  "/docs/llms.mdx/docs{/*path}",
);

export default function proxy(request: NextRequest) {
  if (isMarkdownPreferred(request)) {
    const result = rewriteLLM(request.nextUrl.pathname);

    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/docs/:path*"],
};
