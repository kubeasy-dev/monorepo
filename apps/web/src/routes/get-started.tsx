import { createFileRoute } from "@tanstack/react-router";

const DOCS_GETTING_STARTED = "/docs/user/getting-started";

export const Route = createFileRoute("/get-started")({
  beforeLoad: () => {
    throw new Response(null, {
      status: 301,
      headers: { Location: DOCS_GETTING_STARTED },
    });
  },
});
