import { apiApp, syncApiApp } from "./openapi-apps";

const servers = [
  { url: "https://kubeasy.dev", description: "Production" },
  { url: "http://localhost:3024", description: "Development" },
];

export function generateApiDocument() {
  return apiApp.getOpenAPI31Document({
    openapi: "3.1.0",
    info: {
      title: "Kubeasy API",
      version: "1.0.0",
      description:
        "Public API for the Kubeasy platform. Web routes use session cookie authentication; CLI routes use Bearer token authentication.",
    },
    servers,
    tags: [
      { name: "Challenges", description: "Challenge catalogue and objectives" },
      { name: "Progress", description: "User progress on challenges" },
      { name: "Submissions", description: "Challenge submission history" },
      { name: "User", description: "User profile and settings" },
      { name: "XP", description: "Experience points, ranking and streaks" },
      { name: "Onboarding", description: "New user onboarding flow" },
      {
        name: "Metadata",
        description: "Static reference data (themes, types)",
      },
      {
        name: "Deprecated",
        description: "Legacy CLI routes kept for backward compatibility",
      },
    ],
  });
}

export function generateSyncApiDocument() {
  return syncApiApp.getOpenAPI31Document({
    openapi: "3.1.0",
    info: {
      title: "Kubeasy Sync API",
      version: "1.0.0",
      description:
        "API used by CI/CD pipelines to synchronise challenges from the challenges repository. Requires a Bearer API key with admin privileges.",
    },
    servers,
    tags: [
      {
        name: "Sync",
        description: "Challenge synchronisation from the challenges repository",
      },
    ],
  });
}
