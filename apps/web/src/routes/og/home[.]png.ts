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
                    padding: "60px",
                    fontFamily: "Geist",
                    justifyContent: "space-between",
                  },
                  children: [
                    // Logo badge
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
                                alignItems: "center",
                                justifyContent: "center",
                                background: "#000000",
                                color: "#ffffff",
                                fontWeight: 700,
                                fontSize: 28,
                                padding: "10px 20px",
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
                                alignItems: "center",
                                background: "#f5f5f5",
                                border: "2px solid #000",
                                padding: "8px 16px",
                                fontSize: 18,
                                fontWeight: 600,
                                color: "#555",
                              },
                              children: ["kubeasy.dev"],
                            },
                          },
                        ],
                      },
                    },

                    // Main content
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
                                fontSize: 72,
                                fontWeight: 700,
                                color: "#000000",
                                lineHeight: 1.1,
                                letterSpacing: "-2px",
                              },
                              children: [
                                "Learn Kubernetes by solving real broken clusters.",
                              ],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: 28,
                                fontWeight: 500,
                                color: "#444444",
                                lineHeight: 1.4,
                              },
                              children: [
                                "Hands-on challenges. Your own local cluster. Free and open source.",
                              ],
                            },
                          },
                        ],
                      },
                    },

                    // Bottom row: tags
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
                                padding: "10px 20px",
                                background: "#f0f0f0",
                                border: "2px solid #000",
                                fontSize: 18,
                                fontWeight: 600,
                                color: "#000",
                              },
                              children: ["Kubernetes Challenges"],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                padding: "10px 20px",
                                background: "#f0f0f0",
                                border: "2px solid #000",
                                fontSize: 18,
                                fontWeight: 600,
                                color: "#000",
                              },
                              children: ["Kind Cluster"],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                padding: "10px 20px",
                                background: "#f0f0f0",
                                border: "2px solid #000",
                                fontSize: 18,
                                fontWeight: 600,
                                color: "#000",
                              },
                              children: ["Free & Open Source"],
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
