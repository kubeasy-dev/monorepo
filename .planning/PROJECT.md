# Kubeasy — Monorepo Refactoring

## What This Is

Refactoring du repo `website` de Kubeasy depuis un monolithe Next.js 15 vers un monorepo TypeScript avec Turborepo. Le monorepo héberge deux apps distinctes — un frontend Tanstack Start orienté génération statique et une API Hono découplée — plus des packages partagés pour les contrats d'API et les définitions de jobs asynchrones.

Les fonctionnalités restent identiques : apprentissage Kubernetes par challenges interactifs, suivi de progression, XP, blog, et validation en temps réel des soumissions CLI.

## Core Value

Une architecture découplée où l'API Hono est la source de vérité unique (auth, données, temps réel) et où le web Tanstack Start est un client statique/hybride qui la consomme — avec un système de jobs BullMQ assez découplé pour migrer vers un worker dédié sans refacto majeur.

## Requirements

### Validated

<!-- Fonctionnalités existantes dans le monolithe Next.js -->

- ✓ Listing et filtrage des challenges par thème, difficulté, type — existing
- ✓ Authentification OAuth (GitHub, Google, Microsoft) via Better Auth — existing
- ✓ Soumission de challenges depuis la CLI avec validation des objectifs — existing
- ✓ Suivi de progression utilisateur et système XP/niveaux — existing
- ✓ Affichage temps réel du statut de validation après soumission — existing
- ✓ Blog de contenu (source Notion) — existing
- ✓ Pages landing marketing — existing
- ✓ Gestion des clés API pour la CLI — existing

### Active

<!-- Architecture monorepo — ce qu'on construit -->

- [ ] Monorepo Turborepo + pnpm workspaces avec `apps/web`, `apps/api`, et packages partagés
- [ ] `apps/api` — Hono HTTP API (REST + SSE) remplaçant le layer tRPC Next.js
- [ ] `apps/web` — Tanstack Start avec SSG pour landing/blog, hybrid pour challenges
- [ ] `packages/api-schemas` — Contrats Zod partagés pour requêtes/réponses API
- [ ] `packages/jobs` — Définitions BullMQ découplées (@kubeasy/jobs) pour processing async
- [ ] Better Auth migré dans `apps/api`, web utilise le client Better Auth
- [ ] Redis comme couche cache, pub/sub et SSE (remplace Upstash serverless)
- [ ] Stack docker-compose complète pour développement local (Postgres, Redis, OTel Collector)
- [ ] Déploiement Railway (remplace Vercel) avec configuration ISO locale
- [ ] Observabilité full OpenTelemetry — métriques, traces, logs via un collector centralisé
- [ ] Même schéma Drizzle PostgreSQL, migré dans `apps/api`
- [ ] Suppression des dépendances Vercel/Upstash serverless/Neon serverless

### Out of Scope

- tRPC — remplacé par REST + Zod schemas partagés via `@kubeasy/api-schemas`
- Upstash (Redis REST serverless) — remplacé par Redis natif via docker-compose/Railway
- Vercel deployment — remplacé par Railway
- Notion comme source de blog — à conserver pour l'instant, évaluation future
- Migration du schéma DB — même schéma, pas de changements fonctionnels
- App worker séparée pour BullMQ — architecture préparée mais pas encore extraite

## Context

**Existant à migrer :**
- Next.js 15 / React 19 avec tRPC 11, Drizzle ORM, Better Auth 1.5, Tailwind CSS 4
- Realtime via Upstash Realtime (Redis Streams) — remplacé par SSE natif Hono + Redis
- Logs/analytics via PostHog + OpenTelemetry exporter PostHog — remplacé par OTel Collector
- Notion API pour le contenu blog

**Décisions architecturales clés :**
- L'API Hono expose des endpoints REST typés via `@kubeasy/api-schemas` (Zod)
- Le web Tanstack Start consomme l'API via Tanstack Query (pas tRPC)
- SSE depuis Hono via Redis pub/sub pour les updates temps réel (statut validation)
- BullMQ dans `apps/api` mais défini dans `packages/jobs` — l'API dispatch, le package définit les jobs
- OTel Collector dans docker-compose reçoit tout (OTLP) et exporte vers une destination TBD (Grafana Cloud, Honeycomb, etc.)

**Infra locale (docker-compose) :**
- PostgreSQL
- Redis
- OpenTelemetry Collector (OTLP → destination externe)

**Infra production (Railway) :**
- Service `api` (Hono)
- Service `web` (Tanstack Start SSG/SSR)
- PostgreSQL (plugin Railway)
- Redis (plugin Railway)
- OpenTelemetry Collector (service Railway)

## Constraints

- **Tech stack** : Turborepo + pnpm workspaces — orchestration monorepo
- **Compatibilité CLI** : Les endpoints API CLI doivent rester compatibles avec `kubeasy-cli` (Go) — même contrats de données
- **Schéma DB** : Pas de changement de schéma dans ce milestone — migration pure
- **PostHog** : Conservé pour les analytics produit, mais les logs OTel ne passent plus par PostHog directement
- **Découplage jobs** : `packages/jobs` ne doit pas importer depuis `apps/api` — dépendance unidirectionnelle

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Turborepo comme orchestrateur monorepo | Cache de build, pipelines task, bien intégré pnpm | — Pending |
| Hono pour l'API (remplace tRPC dans Next.js) | Découplage web/api, support natif SSE, standard HTTP REST | — Pending |
| Tanstack Start pour le web (remplace Next.js) | SSG natif, Tanstack Query intégré, pas de vendor lock Vercel | — Pending |
| REST + @kubeasy/api-schemas (remplace tRPC) | Contrats partagés sans couplage framework, consommable par CLI Go | — Pending |
| @kubeasy/jobs package (découplage BullMQ) | Migration future vers worker dédié sans refacto API | — Pending |
| SSE via Redis pub/sub (remplace Upstash Realtime) | Stack self-hosted, contrôle, ISO local/prod | — Pending |
| Railway (remplace Vercel) | Adapté aux apps non-serverless (Hono long-lived, Redis, workers) | — Pending |
| OTel Collector centralisé (remplace export direct PostHog) | Flexibilité destination, standard industrie, pas de vendor lock observabilité | — Pending |
| Refacto in-place dans ce repo | Historique git préservé, transition progressive | — Pending |

---
*Last updated: 2026-03-18 after initialization*
