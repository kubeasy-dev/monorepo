import { Resvg } from "@resvg/resvg-js";
import { createFileRoute } from "@tanstack/react-router";
import satori from "satori";
import { getGeistFont } from "@/lib/og-fonts";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

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
              background: "#7c3aed", // Kubeasy Violet
              padding: "40px",
              fontFamily: "Geist",
            },
            children: [
              // Grid Background Pattern (simulated with a child)
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
                      "radial-gradient(circle, rgba(0,0,0,0.15) 1.5px, transparent 1.5px)",
                    backgroundSize: "32px 32px",
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
                    background: "#ffffff",
                    border: "8px solid #000000",
                    boxShadow: "20px 20px 0px 0px #000000",
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
                                justifyContent: "center",
                                background: "#000000",
                                color: "#ffffff",
                                fontWeight: 900,
                                fontSize: 32,
                                padding: "12px 24px",
                                transform: "rotate(-2deg)",
                              },
                              children: ["KUBEASY"],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 24,
                                fontWeight: 600,
                                color: "#000000",
                                opacity: 0.5,
                              },
                              children: ["kubeasy.dev"],
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
                          gap: "24px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 84,
                                fontWeight: 900,
                                color: "#000000",
                                lineHeight: 1.0,
                                letterSpacing: "-4px",
                              },
                              children: ["Learn Kubernetes\nby Doing."],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 32,
                                fontWeight: 500,
                                color: "#333333",
                                lineHeight: 1.3,
                                maxWidth: "800px",
                              },
                              children: [
                                "Solve real production incidents on your own local clusters. Free, open-source, and hands-on.",
                              ],
                            },
                          },
                        ],
                      },
                    },

                    // Footer Tags
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                padding: "12px 24px",
                                background: "#00E5FF", // Cyan
                                border: "4px solid #000000",
                                fontSize: 20,
                                fontWeight: 800,
                                color: "#000000",
                                boxShadow: "6px 6px 0px 0px #000000",
                              },
                              children: ["13 CHALLENGES"],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                padding: "12px 24px",
                                background: "#FF70FF", // Pink
                                border: "4px solid #000000",
                                fontSize: 20,
                                fontWeight: 800,
                                color: "#000000",
                                boxShadow: "6px 6px 0px 0px #000000",
                              },
                              children: ["LOCAL CLUSTERS"],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                padding: "12px 24px",
                                background: "#00FF94", // Green
                                border: "4px solid #000000",
                                fontSize: 20,
                                fontWeight: 800,
                                color: "#000000",
                                boxShadow: "6px 6px 0px 0px #000000",
                              },
                              children: ["OPEN SOURCE"],
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
