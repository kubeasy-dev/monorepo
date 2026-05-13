import { Resvg } from "@resvg/resvg-js";
import { createFileRoute } from "@tanstack/react-router";
import satori from "satori";
import { getGeistFont } from "@/lib/og-fonts";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// Brand Colors (Neo-brutalist palette)
const COLORS = {
  background: "#fdfcf6", // Cream / oklch(0.98 0.01 90)
  primary: "#7c3aed", // Violet / oklch(0.55 0.25 280)
  secondary: "#f9f5e1", // Light Yellow / oklch(0.95 0.05 85)
  accent: "#00E5FF", // Cyan
  black: "#000000",
  border: "#000000",
  white: "#ffffff",
};

export const Route = createFileRoute("/og/home.png")({
  server: {
    handlers: {
      GET: async () => {
        const fontData = await getGeistFont();

        // biome-ignore lint/suspicious/noExplicitAny: satori accepts VNode plain objects at runtime
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

              // Large "K" background watermark
              {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    right: "-100px",
                    bottom: "-150px",
                    display: "flex",
                    fontSize: "800px",
                    fontWeight: 900,
                    color: COLORS.primary,
                    opacity: 0.05,
                    lineHeight: 1,
                  },
                  children: ["K"],
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
                    padding: "60px",
                    justifyContent: "space-between",
                    position: "relative",
                  },
                  children: [
                    // Header
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
                                  type: "div",
                                  props: {
                                    style: {
                                      display: "flex",
                                      background: COLORS.black,
                                      color: COLORS.white,
                                      fontWeight: 900,
                                      fontSize: 32,
                                      padding: "10px 20px",
                                      borderRadius: "4px",
                                    },
                                    children: ["KUBEASY"],
                                  },
                                },
                              ],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 20,
                                fontWeight: 700,
                                color: COLORS.black,
                                opacity: 0.4,
                                textTransform: "uppercase",
                                letterSpacing: "2px",
                              },
                              children: ["kubeasy.dev"],
                            },
                          },
                        ],
                      },
                    },

                    // Hero Content
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: "32px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                flexDirection: "column",
                              },
                              children: [
                                {
                                  type: "div",
                                  props: {
                                    style: {
                                      display: "flex",
                                      fontSize: 84,
                                      fontWeight: 900,
                                      color: COLORS.black,
                                      lineHeight: 1,
                                      letterSpacing: "-4px",
                                    },
                                    children: ["Learn Kubernetes"],
                                  },
                                },
                                {
                                  type: "div",
                                  props: {
                                    style: {
                                      display: "flex",
                                      fontSize: 84,
                                      fontWeight: 900,
                                      color: COLORS.primary,
                                      lineHeight: 1,
                                      letterSpacing: "-4px",
                                      marginTop: "4px",
                                    },
                                    children: ["by Solving Incidents."],
                                  },
                                },
                              ],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 32,
                                fontWeight: 500,
                                color: COLORS.black,
                                opacity: 0.8,
                                lineHeight: 1.3,
                                maxWidth: "800px",
                              },
                              children: [
                                "Hands-on challenges on your local cluster. From CrashLoopBackOff to RBAC — free and open source.",
                              ],
                            },
                          },
                        ],
                      },
                    },

                    // Footer / Stats
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "20px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                background: COLORS.secondary,
                                border: "4px solid #000",
                                padding: "10px 20px",
                                fontSize: 20,
                                fontWeight: 800,
                                borderRadius: "8px",
                                boxShadow: "6px 6px 0px 0px #000",
                              },
                              children: ["13 CHALLENGES"],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                background: COLORS.accent,
                                border: "4px solid #000",
                                padding: "10px 20px",
                                fontSize: 20,
                                fontWeight: 800,
                                borderRadius: "8px",
                                boxShadow: "6px 6px 0px 0px #000",
                              },
                              children: ["LOCAL KIND CLUSTER"],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                background: COLORS.white,
                                border: "4px solid #000",
                                padding: "10px 20px",
                                fontSize: 20,
                                fontWeight: 800,
                                borderRadius: "8px",
                                boxShadow: "6px 6px 0px 0px #000",
                              },
                              children: ["FREE & OPEN SOURCE"],
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
