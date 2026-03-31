ARG BASE_DIGEST
ARG PNPM_VERSION=10.32.1

FROM ghcr.io/kubeasy-dev/app-docker-base@${BASE_DIGEST} AS base

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

RUN pnpm install -g turbo