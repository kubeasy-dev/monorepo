export const difficulties = [
  { value: "all", label: "All Levels" },
  { value: "easy", label: "Beginner" },
  { value: "medium", label: "Intermediate" },
  { value: "hard", label: "Advanced" },
];

import type { ChallengeDifficulty } from "@kubeasy/api-schemas/challenges";

export const difficultyLabels: Record<ChallengeDifficulty, string> = {
  easy: "Beginner",
  medium: "Intermediate",
  hard: "Advanced",
};

const githubOwner = "kubeasy-dev";

export const siteConfig = {
  name: "Kubeasy",
  tagline: "Learn Kubernetes Through Interactive Challenges",
  description:
    "Master Kubernetes through hands-on challenges and real-world scenarios. Free, open-source learning platform for developers.",
  url: "https://kubeasy.dev",
  ogImage: "https://kubeasy.dev/og.jpg",
  links: {
    github: `https://github.com/${githubOwner}`,
    twitter: "https://twitter.com/kubeasy_dev",
    docs: "https://docs.kubeasy.dev",
  },
  github: {
    owner: githubOwner,
    repo: "website",
  },
};
