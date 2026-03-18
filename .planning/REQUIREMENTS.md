# Requirements: Kubeasy Monorepo Refactoring

**Defined:** 2026-03-18
**Core Value:** Architecture découplée où l'API Hono est la source de vérité unique, le web Tanstack Start est un client statique/hybride, et le système BullMQ est assez découplé pour migrer vers un worker dédié sans refacto majeur.

---

## v1 Requirements

Scope : migration feature-parity complète vers le monorepo. Aucune nouvelle fonctionnalité — même expérience utilisateur, nouvelle architecture.

### Infrastructure & Monorepo

- [ ] **INFRA-01**: Le repo est restructuré en monorepo Turborepo + pnpm workspaces avec `apps/`, `packages/` et un `turbo.json` configurant les pipelines `build`, `typecheck`, `dev`, `lint`
- [ ] **INFRA-02**: Un `packages/typescript-config` fournit les configurations TypeScript partagées (base, node, react) consommées par toutes les apps et packages
- [ ] **INFRA-03**: Le pipeline Turborepo respecte le graphe de dépendances (`dependsOn: ["^build"]`) — packages compilés avant les apps qui les consomment
- [ ] **INFRA-04**: Un `docker-compose.yml` démarre l'environnement de développement local complet : PostgreSQL, Redis, OTel Collector

### Packages Partagés

- [ ] **PKG-01**: Le package `@kubeasy/api-schemas` (JIT, pas de build step) exporte les schémas Zod de toutes les requêtes et réponses API — consommable par `apps/api`, `apps/web` et le CLI Go
- [ ] **PKG-02**: `@kubeasy/api-schemas` couvre 100% des endpoints : challenges (liste, détail), themes, user progress, XP, soumissions, authentification
- [ ] **PKG-03**: Le package `@kubeasy/jobs` (JIT) exporte les noms de queues BullMQ, les types de payloads de jobs (`JobPayload`), et une factory `createQueue(name, redis)` — sans implémenter de `Worker` (consommé par l'API pour dispatcher, par un futur worker pour consommer)
- [ ] **PKG-04**: `@kubeasy/jobs` ne dépend d'aucun package `apps/` — dépendance unidirectionnelle stricte

### API Hono (`apps/api`)

- [ ] **API-01**: L'app `apps/api` tourne avec Hono 4.x + `@hono/node-server` (Node.js long-lived, pas serverless) et démarre avec une seule commande en local via docker-compose
- [ ] **API-02**: Tous les endpoints challenges sont portés depuis tRPC vers REST : liste avec filtres (difficulté, thème, type), détail par slug, liste des thèmes
- [ ] **API-03**: Tous les endpoints user progress sont portés : statut de progression, historique des soumissions, dernier statut de validation par challenge
- [ ] **API-04**: Tous les endpoints XP sont portés : solde XP utilisateur, historique des transactions XP
- [ ] **API-05**: L'endpoint de soumission CLI (`POST /api/challenges/:slug/submit`) valide que tous les objectifs enregistrés sont présents (ni manquants, ni inconnus), enrichit les résultats avec les métadonnées de `challengeObjective`, stocke en DB, distribue XP si tous passés
- [ ] **API-06**: Un middleware session Hono extrait la session Better Auth depuis les cookies sur les routes protégées et injecte `user` + `session` dans le contexte Hono (`c.var`)
- [ ] **API-07**: La connexion PostgreSQL utilise `postgres` (postgres.js) comme driver Drizzle — le driver Neon serverless (`@neondatabase/serverless`) est supprimé
- [ ] **API-08**: Le schéma Drizzle existant (`server/db/schema/`) est migré tel quel dans `apps/api` — aucun changement de schéma DB dans ce milestone

### Authentification

- [ ] **AUTH-01**: Better Auth est configuré dans `apps/api` avec l'adaptateur Drizzle et monte son handler sur `GET/POST /api/auth/*`
- [ ] **AUTH-02**: Les providers OAuth GitHub, Google et Microsoft sont configurés dans Better Auth côté API
- [ ] **AUTH-03**: `@hono/cors` est configuré avant le handler Better Auth avec `credentials: true` et les origines de confiance listées (localhost dev + domaines production)
- [ ] **AUTH-04**: Le plugin `apiKey()` Better Auth est activé — les utilisateurs peuvent créer, lister et révoquer des clés API depuis l'interface web
- [ ] **AUTH-05**: Un middleware Hono valide les clés API (`Authorization: Bearer <key>`) sur les routes CLI et injecte l'utilisateur associé dans `c.var`
- [ ] **AUTH-06**: Le web `apps/web` utilise `createAuthClient` de Better Auth pointant vers l'URL de l'API — pas d'instance Better Auth dans le web

### Web Tanstack Start (`apps/web`)

- [ ] **WEB-01**: L'app `apps/web` est migrée de Next.js 15 vers Tanstack Start avec le routeur Tanstack Router
- [ ] **WEB-02**: Tous les hooks tRPC sont remplacés par des wrappers `fetch` typés via `z.infer<>` sur les schémas `@kubeasy/api-schemas`, orchestrés avec Tanstack Query (`useQuery`, `useMutation`)
- [ ] **WEB-03**: Les routes loader Tanstack Start préfetchent les données serveur (challenge liste, détail) et hydratent le client via la déshydratation Tanstack Query
- [ ] **WEB-04**: Les pages landing (homepage, pricing, about) et les articles de blog sont pré-rendus en SSG à build time via la config `prerender` de Tanstack Start
- [ ] **WEB-05**: Les pages challenges utilisent un rendu hybride : données de base pré-rendues ou SSR via loader, statut de validation live via client uniquement
- [ ] **WEB-06**: Le client Tanstack Start consomme les événements SSE via `EventSource` et appelle `queryClient.invalidateQueries` à réception — affichage temps réel du statut de validation sans polling
- [ ] **WEB-07**: Le frontend Tanstack Start envoie `credentials: "include"` sur tous les appels fetch vers l'API pour partager les cookies de session Better Auth

### Realtime SSE

- [ ] **REAL-01**: L'endpoint SSE Hono (`GET /api/sse/validation/:challengeSlug`) ouvre un flux SSE par connexion client, s'abonne au canal Redis `validation:{userId}:{challengeSlug}`, et pousse les événements reçus
- [ ] **REAL-02**: L'endpoint de soumission CLI publie (`REDIS PUBLISH`) sur le canal `validation:{userId}:{challengeSlug}` après enrichissement et stockage — le SSE endpoint reçoit et forward au browser
- [ ] **REAL-03**: Chaque connexion SSE utilise une connexion ioredis subscriber dédiée (non partagée) et nettoie la subscription Redis à la déconnexion du client (abort signal)
- [ ] **REAL-04**: Redis est configuré avec `maxmemory-policy noeviction` dans docker-compose et Railway pour garantir la fiabilité de BullMQ et du pub/sub

### Observabilité OpenTelemetry

- [ ] **OBS-01**: Le `docker-compose.yml` inclut un service OpenTelemetry Collector configuré pour recevoir OTLP (grpc + http) et exporter vers une destination externe (config exporters, destination TBD)
- [ ] **OBS-02**: `apps/api` initialise le SDK OTel (`@opentelemetry/sdk-node`) avant tout import de package interne — traces HTTP, spans DB (Drizzle), logs structurés exportés en OTLP
- [ ] **OBS-03**: `apps/web` initialise le SDK OTel côté serveur (SSR/loader) — traces de navigation, erreurs capturées, logs exportés en OTLP
- [ ] **OBS-04**: PostHog est conservé pour les analytics produit (événements utilisateur) mais les logs et traces passent par OTel Collector uniquement
- [ ] **OBS-05**: Un test de fumée (DB span visible dans le collector) valide l'ordre d'initialisation OTel avant de considérer la phase complète

### Déploiement Railway

- [ ] **DEPLOY-01**: Chaque service (`apps/api`, `apps/web`) a un Dockerfile multi-stage utilisant `turbo prune --scope=<app> --docker` pour produire une image minimale
- [ ] **DEPLOY-02**: Les services Railway ont leurs `Root Directory` et `Watch Paths` correctement configurés — un changement dans `packages/` déclenche le redéploiement des apps qui en dépendent
- [ ] **DEPLOY-03**: Railway utilise les plugins PostgreSQL et Redis natifs en production — configuration ISO avec docker-compose local (même variables d'environnement)
- [ ] **DEPLOY-04**: Un service Railway OTel Collector est configuré pour les environnements preview et production, recevant OTLP des apps déployées

---

## v2 Requirements

Deferred — architecture préparée mais hors scope v1.

### OpenAPI & CLI Go

- **OPENAPI-01**: Génération spec OpenAPI depuis `@hono/zod-openapi` pour auto-générer les types client Go — ajoute du boilerplate aux définitions de routes
- **OPENAPI-02**: ISR (Incremental Static Regeneration) pour les routes blog — full rebuild au deploy est acceptable pour v1

### BullMQ Worker App

- **WORKER-01**: Extraction de `apps/worker` consommant `@kubeasy/jobs` — déclenchée quand le volume de jobs le justifie
- **WORKER-02**: Migration du contenu blog de Notion vers MDX — hors scope, évaluation post-migration

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| tRPC dans la nouvelle architecture | Remplacé par REST + @kubeasy/api-schemas — décision architecturale explicite |
| Hono RPC client (`hc<AppType>()`) | Incompatible avec le CLI Go — anti-pattern pour ce projet |
| WebSockets | SSE suffisant pour le cas d'usage unidirectionnel actuel |
| Polling frontend pour validation | Remplacé par SSE |
| Schema Drizzle partagé entre apps | Drizzle schemas couplés aux migrations — worker communique via @kubeasy/jobs |
| Changements de schéma DB | Hors scope — migration pure, même schéma |
| Migration source blog (Notion → MDX) | Hors scope de ce milestone |
| App worker BullMQ séparée | Architecture préparée mais pas encore extraite |
| Vercel deployment | Remplacé par Railway |
| Upstash (Redis serverless) | Remplacé par Redis natif |
| Neon serverless driver | Remplacé par postgres.js |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| PKG-01 | Phase 1 | Pending |
| PKG-02 | Phase 1 | Pending |
| PKG-03 | Phase 1 | Pending |
| PKG-04 | Phase 1 | Pending |
| API-01 | Phase 2 | Pending |
| API-02 | Phase 2 | Pending |
| API-03 | Phase 2 | Pending |
| API-04 | Phase 2 | Pending |
| API-05 | Phase 2 | Pending |
| API-06 | Phase 2 | Pending |
| API-07 | Phase 2 | Pending |
| API-08 | Phase 2 | Pending |
| AUTH-01 | Phase 3 | Pending |
| AUTH-02 | Phase 3 | Pending |
| AUTH-03 | Phase 3 | Pending |
| AUTH-04 | Phase 3 | Pending |
| AUTH-05 | Phase 3 | Pending |
| AUTH-06 | Phase 3 | Pending |
| WEB-01 | Phase 4 | Pending |
| WEB-02 | Phase 4 | Pending |
| WEB-03 | Phase 4 | Pending |
| WEB-04 | Phase 4 | Pending |
| WEB-05 | Phase 4 | Pending |
| WEB-06 | Phase 4 | Pending |
| WEB-07 | Phase 4 | Pending |
| REAL-01 | Phase 5 | Pending |
| REAL-02 | Phase 5 | Pending |
| REAL-03 | Phase 5 | Pending |
| REAL-04 | Phase 5 | Pending |
| OBS-01 | Phase 6 | Pending |
| OBS-02 | Phase 6 | Pending |
| OBS-03 | Phase 6 | Pending |
| OBS-04 | Phase 6 | Pending |
| OBS-05 | Phase 6 | Pending |
| DEPLOY-01 | Phase 7 | Pending |
| DEPLOY-02 | Phase 7 | Pending |
| DEPLOY-03 | Phase 7 | Pending |
| DEPLOY-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 39/39 ✓
- Unmapped: 0

---

*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after roadmap creation*
