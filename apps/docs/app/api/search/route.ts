import { createFromSource } from "fumadocs-core/search/server";
import { withEvlog } from "@/lib/evlog";
import { source } from "@/lib/source";

const search = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: "english",
});

export const GET = withEvlog(search.GET);
