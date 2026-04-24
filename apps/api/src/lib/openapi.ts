import { cliApp } from "./openapi-cli";

const servers = [
  { url: "https://kubeasy.dev", description: "Production" },
  { url: "http://localhost:3024", description: "Development" },
];

export function generateApiDocument() {
  return (cliApp as any).getOpenAPIDocument({
    openapi: "3.0.3",
    info: {
      title: "Kubeasy CLI API",
      version: "1.0.0",
      description:
        "Public API for the Kubeasy platform consumed by the CLI. Web routes use session cookie authentication; CLI routes use Bearer token authentication.",
    },
    servers,
  });
}
