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
  easy: "#00FF94", // Neon Green
  medium: "#FFD600", // Yellow (Standard for medium)
  hard: "#FF3D00", // Neon Red
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
          DIFFICULTY_COLORS[challenge.difficulty] ?? "#FFD600";
        const difficultyLabel =
          DIFFICULTY_LABELS[challenge.difficulty] ?? challenge.difficulty;

        // biome-ignore lint/suspicious/noExplicitAny: satori accepts VNode plain objects
        const element: any = {
          type: "div",
          props: {
            style: {
              display: "flex",
              width: "100%",
              height: "100%",
              background: "#7c3aed", // Kubeasy Violet
              padding: "40px",
              fontFamily: "Geist",
            },
            children: [
              // Grid Background
              {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    backgroundImage:
                      "radial-gradient(circle, rgba(255,255,255,0.2) 1.5px, transparent 1.5px)",
                    backgroundSize: "32px 32px",
                  },
                },
              },
              // Card
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    height: "100%",
                    background: "#ffffff",
                    border: "8px solid #000000",
                    boxShadow: "20px 20px 0px 0px #000000",
                    padding: "60px",
                    justifyContent: "space-between",
                    position: "relative",
                  },
                  children: [
                    // Top Bar
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
                                background: "#000000",
                                color: "#ffffff",
                                padding: "8px 16px",
                                fontWeight: 800,
                                fontSize: 24,
                                transform: "rotate(-1deg)",
                              },
                              children: ["CHALLENGE"],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                gap: "12px",
                              },
                              children: [
                                {
                                  type: "div",
                                  props: {
                                    style: {
                                      display: "flex",
                                      padding: "6px 12px",
                                      background: difficultyColor,
                                      border: "3px solid #000000",
                                      fontWeight: 700,
                                      fontSize: 18,
                                      color: "#000000",
                                    },
                                    children: [difficultyLabel.toUpperCase()],
                                  },
                                },
                                {
                                  type: "div",
                                  props: {
                                    style: {
                                      display: "flex",
                                      padding: "6px 12px",
                                      background: "#000000",
                                      color: "#ffffff",
                                      fontWeight: 700,
                                      fontSize: 18,
                                    },
                                    children: [
                                      `${challenge.estimatedTime} MIN`,
                                    ],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },

                    // Content
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: "20px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 72,
                                fontWeight: 900,
                                color: "#000000",
                                lineHeight: 1.1,
                                letterSpacing: "-3px",
                              },
                              children: [truncate(challenge.title, 60)],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 28,
                                fontWeight: 500,
                                color: "#444444",
                                lineHeight: 1.4,
                              },
                              children: [truncate(challenge.description, 150)],
                            },
                          },
                        ],
                      },
                    },

                    // Footer
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
                                padding: "8px 16px",
                                background: "#00E5FF",
                                border: "4px solid #000000",
                                fontWeight: 800,
                                fontSize: 20,
                                boxShadow: "4px 4px 0px 0px #000000",
                                textTransform: "uppercase",
                              },
                              children: [challenge.theme],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 20,
                                fontWeight: 600,
                                color: "#000000",
                                opacity: 0.4,
                              },
                              children: ["kubeasy.dev"],
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
            { name: "Geist", data: fontData, weight: 500, style: "normal" },
            { name: "Geist", data: fontData, weight: 600, style: "normal" },
            { name: "Geist", data: fontData, weight: 700, style: "normal" },
            { name: "Geist", data: fontData, weight: 800, style: "normal" },
            { name: "Geist", data: fontData, weight: 900, style: "normal" },
          ],
        });

        const resvg = new Resvg(svg, {
          fitTo: { mode: "width", value: OG_WIDTH },
        });
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
