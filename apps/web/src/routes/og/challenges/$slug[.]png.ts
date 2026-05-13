import type { ChallengeDifficulty } from "@kubeasy/api-schemas/challenges";
import { Resvg } from "@resvg/resvg-js";
import { createFileRoute } from "@tanstack/react-router";
import { useRequest } from "nitro/context";
import satori from "satori";
import { getGeistFont, getLogoData } from "@/lib/og-assets";
import { rpc } from "@/lib/rpc";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// Brand Colors
const COLORS = {
  background: "#fdfcf6",
  primary: "#7c3aed",
  black: "#000000",
  white: "#ffffff",
  difficulty: {
    easy: "#00FF94",
    medium: "#FFD600",
    hard: "#FF3D00",
  },
  accent: "#00E5FF", // Cyan for prompt
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

        const [fontData, logoData] = await Promise.all([
          getGeistFont(),
          getLogoData(),
        ]);
        const difficultyColor = COLORS.difficulty[challenge.difficulty];
        const difficultyLabel = DIFFICULTY_LABELS[challenge.difficulty];

        // biome-ignore lint/suspicious/noExplicitAny: satori accepts VNode plain objects
        const element: any = {
          type: "div",
          props: {
            style: {
              display: "flex",
              width: "100%",
              height: "100%",
              background: COLORS.background,
              fontFamily: "Geist",
              padding: "40px",
              position: "relative",
            },
            children: [
              // Grid Pattern
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
                    backgroundImage: `radial-gradient(circle, ${COLORS.black}1A 1.5px, transparent 1.5px)`,
                    backgroundSize: "32px 32px",
                  },
                },
              },

              // Corner difficulty indicator (triangle)
              {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "180px",
                    height: "180px",
                    background: difficultyColor,
                    display: "flex",
                    clipPath: "polygon(100% 0, 0 0, 100% 100%)",
                  },
                },
              },

              // Main Card
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    height: "100%",
                    background: COLORS.white,
                    border: "5px solid #000000",
                    borderRadius: "12px",
                    boxShadow: "16px 16px 0px 0px #000000",
                    padding: "50px 60px",
                    justifyContent: "space-between",
                    position: "relative",
                  },
                  children: [
                    // Header Bar
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
                                gap: "12px",
                              },
                              children: [
                                {
                                  type: "img",
                                  props: {
                                    src: logoData,
                                    width: 36,
                                    height: 36,
                                    style: { display: "flex" },
                                  },
                                },
                                {
                                  type: "div",
                                  props: {
                                    style: {
                                      display: "flex",
                                      background: COLORS.black,
                                      color: COLORS.white,
                                      fontWeight: 900,
                                      fontSize: 24,
                                      padding: "8px 16px",
                                      borderRadius: "4px",
                                    },
                                    children: ["CHALLENGE"],
                                  },
                                },
                                {
                                  type: "div",
                                  props: {
                                    style: {
                                      display: "flex",
                                      fontSize: 18,
                                      fontWeight: 700,
                                      color: COLORS.black,
                                      opacity: 0.4,
                                      letterSpacing: "1px",
                                    },
                                    children: ["KUBEASY.DEV"],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },

                    // Main Content
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
                                fontSize: 80,
                                fontWeight: 900,
                                color: COLORS.black,
                                lineHeight: 1.0,
                                letterSpacing: "-4px",
                              },
                              children: [truncate(challenge.title, 55)],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 26,
                                fontWeight: 500,
                                color: COLORS.black,
                                opacity: 0.7,
                                lineHeight: 1.3,
                                maxWidth: "950px",
                              },
                              children: [truncate(challenge.description, 180)],
                            },
                          },
                        ],
                      },
                    },

                    // CLI Section
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 18,
                                fontWeight: 700,
                                color: COLORS.primary,
                                textTransform: "uppercase",
                                letterSpacing: "1px",
                              },
                              children: [
                                "Play this challenge on your terminal:",
                              ],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                alignItems: "center",
                                padding: "16px 24px",
                                background: COLORS.black,
                                color: COLORS.white,
                                fontWeight: 700,
                                fontSize: 24,
                                borderRadius: "8px",
                                border: "3px solid #000",
                              },
                              children: [
                                {
                                  type: "span",
                                  props: {
                                    style: { color: COLORS.accent },
                                    children: ["$"],
                                  },
                                },
                                {
                                  type: "span",
                                  props: {
                                    style: { marginLeft: "12px" },
                                    children: [
                                      `kubeasy challenge start ${slug}`,
                                    ],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },

                    // Footer Row (Metadata)
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-start",
                          width: "100%",
                          gap: "12px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                padding: "8px 16px",
                                background: COLORS.primary,
                                border: "3px solid #000",
                                color: COLORS.white,
                                fontWeight: 800,
                                fontSize: 18,
                                borderRadius: "6px",
                                boxShadow: "4px 4px 0px 0px #000",
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
                                padding: "8px 16px",
                                background: difficultyColor,
                                border: "3px solid #000",
                                fontWeight: 800,
                                fontSize: 18,
                                borderRadius: "6px",
                                boxShadow: "4px 4px 0px 0px #000",
                              },
                              children: [difficultyLabel.toUpperCase()],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 16px",
                                background: "#f9f5e1",
                                border: "3px solid #000",
                                fontWeight: 800,
                                fontSize: 18,
                                borderRadius: "6px",
                                boxShadow: "4px 4px 0px 0px #000",
                              },
                              children: [
                                {
                                  type: "svg",
                                  props: {
                                    width: 20,
                                    height: 20,
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: 3,
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    style: { display: "flex" },
                                    children: [
                                      {
                                        type: "circle",
                                        props: { cx: 12, cy: 12, r: 10 },
                                      },
                                      {
                                        type: "polyline",
                                        props: {
                                          points: "12 6 12 12 16 14",
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  type: "span",
                                  props: {
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
