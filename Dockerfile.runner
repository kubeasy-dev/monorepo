ARG BASE_DIGEST
ARG PNPM_VERSION=10.32.1

FROM ghcr.io/kubeasy-dev/app-docker-base@${BASE_DIGEST} AS base

RUN corepack enable && corepack prepare pnpm@{PNPM_VERSION} --activate

RUN pnpm install -g turbo