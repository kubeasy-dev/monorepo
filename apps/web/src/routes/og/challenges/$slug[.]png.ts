import type { ChallengeDifficulty } from "@kubeasy/api-schemas/challenges";
import { Resvg } from "@resvg/resvg-js";
import { createFileRoute } from "@tanstack/react-router";
import { useRequest } from "nitro/context";
import satori from "satori";
import { getGeistFont } from "@/lib/og-fonts";
import { rpc } from "@/lib/rpc";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const DIFFICULTY_COLORS: Record<ChallengeDifficulty, string> = {
  easy: "#16a34a",
  medium: "#ea580c",
  hard: "#dc2626",
};

const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  easy: "Beginner",
  medium: "Intermediate",
  hard: "Advanced",
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export const Route = createFileRoute("/og/challenges/$slug.png")({
  server: {
    handlers: {
      GET: async () => {
        const req = useRequest();
        // ServerRequest extends Web API Request; use .url to get the full URL
        const pathname = new URL(req.url).pathname;
        const pathSegment = pathname.split("/").pop() ?? "";
        const slug = pathSegment.endsWith(".png")
          ? pathSegment.slice(0, -4)
          : pathSegment;

        if (!slug) return new Response(null, { status: 404 });

        let challenge: {
          title: string;
          description: string;
          difficulty: ChallengeDifficulty;
          theme: string;
          estimatedTime: number;
        } | null = null;

        try {
          const res = await rpc.challenges[":slug"].$get({ param: { slug } });
          if (!res.ok) return new Response(null, { status: 404 });
          const data = await res.json();
          if (!data.challenge) return new Response(null, { status: 404 });
          challenge = data.challenge;
        } catch {
          return new Response(null, { status: 404 });
        }

        if (!challenge) return new Response(null, { status: 404 });

        const fontData = await getGeistFont();
        const difficultyColor =
          DIFFICULTY_COLORS[challenge.difficulty] ?? "#000000";
        const difficultyLabel =
          DIFFICULTY_LABELS[challenge.difficulty] ?? challenge.difficulty;
        const description = truncate(challenge.description, 120);

        // biome-ignore lint/suspicious/noExplicitAny: satori expects ReactNode but also accepts VNode plain objects
        const element: any = {
          type: "div",
          props: {
            style: {
              display: "flex",
              width: "100%",
              height: "100%",
              background: "#000000",
              padding: "6px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    height: "100%",
                    background: "#ffffff",
                    padding: "50px 60px",
                    fontFamily: "Geist",
                    justifyContent: "space-between",
                  },
                  children: [
                    // Top row: logo + site name
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                alignItems: "center",
                                background: "#000000",
                                color: "#ffffff",
                                fontWeight: 700,
                                fontSize: 22,
                                padding: "8px 16px",
                                letterSpacing: "-0.5px",
                              },
                              children: ["KUBEASY"],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 18,
                                fontWeight: 500,
                                color: "#888888",
                              },
                              children: ["kubeasy.dev"],
                            },
                          },
                        ],
                      },
                    },

                    // Main content: title + description
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: "16px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 60,
                                fontWeight: 700,
                                color: "#000000",
                                lineHeight: 1.15,
                                letterSpacing: "-1.5px",
                              },
                              children: [truncate(challenge.title, 60)],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 24,
                                fontWeight: 400,
                                color: "#555555",
                                lineHeight: 1.4,
                              },
                              children: [description],
                            },
                          },
                        ],
                      },
                    },

                    // Bottom row: difficulty, theme, time
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                alignItems: "center",
                                padding: "10px 20px",
                                background: difficultyColor,
                                fontSize: 18,
                                fontWeight: 700,
                                color: "#ffffff",
                              },
                              children: [difficultyLabel],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                padding: "10px 20px",
                                border: "2px solid #000000",
                                fontSize: 18,
                                fontWeight: 600,
                                color: "#000000",
                                textTransform: "capitalize",
                              },
                              children: [challenge.theme],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                padding: "10px 20px",
                                border: "2px solid #000000",
                                fontSize: 18,
                                fontWeight: 600,
                                color: "#000000",
                              },
                              children: [`⏱ ${challenge.estimatedTime} min`],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        };

        const svg = await satori(element, {
          width: OG_WIDTH,
          height: OG_HEIGHT,
          fonts: [
            { name: "Geist", data: fontData, weight: 400, style: "normal" },
            { name: "Geist", data: fontData, weight: 600, style: "normal" },
            { name: "Geist", data: fontData, weight: 700, style: "normal" },
          ],
        });

        const resvg = new Resvg(svg, {
          fitTo: { mode: "width", value: OG_WIDTH },
        });
        // Copy to a fresh Uint8Array<ArrayBuffer> to satisfy BodyInit type constraints
        const png = new Uint8Array(resvg.render().asPng());

        return new Response(png, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
