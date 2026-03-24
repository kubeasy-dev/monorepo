# Requirements: Kubeasy Monorepo Refactoring

**Defined:** 2026-03-18
**Core Value:** Architecture découplée où l'API Hono est la source de vérité unique, le web Tanstack Start est un client statique/hybride, et le système BullMQ est assez découplé pour migrer vers un worker dédié sans refacto majeur.

---

## v1 Requirements

Scope : migration feature-parity complète vers le monorepo. Aucune nouvelle fonctionnalité — même expérience utilisateur, nouvelle architecture.

### Infrastructure & Monorepo

- [x] **INFRA-01**: Le repo est restructuré en monorepo Turborepo + pnpm workspaces avec `apps/`, `packages/` et un `turbo.json` configurant les pipelines `build`, `typecheck`, `dev`, `lint`
- [x] **INFRA-02**: Un `packages/typescript-config` fournit les configurations TypeScript partagées (base, node, react) consommées par toutes les apps et packages
- [x] **INFRA-03**: Le pipeline Turborepo respecte le graphe de dépendances (`dependsOn: ["^build"]`) — packages compilés avant les apps qui les consomment
- [x] **INFRA-04**: Un `docker-compose.yml` démarre l'environnement de développement local complet : PostgreSQL, Redis, OTel Collector

### Packages Partagés

- [x] **PKG-01**: Le package `@kubeasy/api-schemas` (JIT, pas de build step) exporte les schémas Zod de toutes les requêtes et réponses API — consommable par `apps/api`, `apps/web` et le CLI Go
- [x] **PKG-02**: `@kubeasy/api-schemas` couvre 100% des endpoints : challenges (liste, détail), themes, user progress, XP, soumissions, authentification
- [x] **PKG-03**: Le package `@kubeasy/jobs` (JIT) exporte les noms de queues BullMQ, les types de payloads de jobs (`JobPayload`), et une factory `createQueue(name, redis)` — sans implémenter de `Worker` (consommé par l'API pour dispatcher, par un futur worker pour consommer)
- [x] **PKG-04**: `@kubeasy/jobs` ne dépend d'aucun package `apps/` — dépendance unidirectionnelle stricte

### API Hono (`apps/api`)

- [x] **API-01**: L'app `apps/api` tourne avec Hono 4.x + `@hono/node-server` (Node.js long-lived, pas serverless) et démarre avec une seule commande en local via docker-compose
- [x] **API-02**: Tous les endpoints challenges sont portés depuis tRPC vers REST : liste avec filtres (difficulté, thème, type), détail par slug, liste des thèmes
- [x] **API-03**: Tous les endpoints user progress sont portés : statut de progression, historique des soumissions, dernier statut de validation par challenge
- [x] **API-04**: Tous les endpoints XP sont portés : solde XP utilisateur, historique des transactions XP
- [x] **API-05**: L'endpoint de soumission CLI (`POST /api/challenges/:slug/submit`) valide que tous les objectifs enregistrés sont présents (ni manquants, ni inconnus), enrichit les résultats avec les métadonnées de `challengeObjective`, stocke en DB, distribue XP si tous passés
- [x] **API-06**: Un middleware session Hono extrait la session Better Auth depuis les cookies sur les routes protégées et injecte `user` + `session` dans le contexte Hono (`c.var`)
- [x] **API-07**: La connexion PostgreSQL utilise `postgres` (postgres.js) comme driver Drizzle — le driver Neon serverless (`@neondatabase/serverless`) est supprimé
- [x] **API-08**: Le schéma Drizzle existant (`server/db/schema/`) est migré tel quel dans `apps/api` — aucun changement de schéma DB dans ce milestone

### Authentification

- [x] **AUTH-01**: Better Auth est configuré dans `apps/api` avec l'adaptateur Drizzle et monte son handler sur `GET/POST /api/auth/*`
- [x] **AUTH-02**: Les providers OAuth GitHub, Google et Microsoft sont configurés dans Better Auth côté API
- [x] **AUTH-03**: `@hono/cors` est configuré avant le handler Better Auth avec `credentials: true` et les origines de confiance listées (localhost dev + domaines production)
- [x] **AUTH-04**: Le plugin `apiKey()` Better Auth est activé — les utilisateurs peuvent créer, lister et révoquer des clés API depuis l'interface web
- [x] **AUTH-05**: Un middleware Hono valide les clés API (`Authorization: Bearer <key>`) sur les routes CLI et injecte l'utilisateur associé dans `c.var`
- [x] **AUTH-06**: Le web `apps/web` utilise `createAuthClient` de Better Auth pointant vers l'URL de l'API — pas d'instance Better Auth dans le web

### Web Tanstack Start (`apps/web`)

- [x] **WEB-01**: L'app `apps/web` est migrée de Next.js 15 vers Tanstack Start avec le routeur Tanstack Router
- [x] **WEB-02**: Tous les hooks tRPC sont remplacés par des wrappers `fetch` typés via `z.infer<>` sur les schémas `@kubeasy/api-schemas`, orchestrés avec Tanstack Query (`useQuery`, `useMutation`)
- [x] **WEB-03**: Les routes loader Tanstack Start préfetchent les données serveur (challenge liste, détail) et hydratent le client via la déshydratation Tanstack Query
- [ ] **WEB-04**: Les pages landing (homepage, pricing, about) et les articles de blog sont pré-rendus en SSG à build time via la config `prerender` de Tanstack Start
- [x] **WEB-05**: Les pages challenges utilisent un rendu hybride : données de base pré-rendues ou SSR via loader, statut de validation live via client uniquement
- [x] **WEB-06**: Le client Tanstack Start consomme les événements SSE via `EventSource` et appelle `queryClient.invalidateQueries` à réception — affichage temps réel du statut de validation sans polling
- [x] **WEB-07**: Le frontend Tanstack Start envoie `credentials: "include"` sur tous les appels fetch vers l'API pour partager les cookies de session Better Auth

### Realtime SSE

- [x] **REAL-01**: L'endpoint SSE Hono (`GET /api/sse/validation/:challengeSlug`) ouvre un flux SSE par connexion client, s'abonne au canal Redis `validation:{userId}:{challengeSlug}`, et pousse les événements reçus
- [x] **REAL-02**: L'endpoint de soumission CLI publie (`REDIS PUBLISH`) sur le canal `validation:{userId}:{challengeSlug}` après enrichissement et stockage — le SSE endpoint reçoit et forward au browser
- [x] **REAL-03**: Chaque connexion SSE utilise une connexion ioredis subscriber dédiée (non partagée) et nettoie la subscription Redis à la déconnexion du client (abort signal)
- [x] **REAL-04**: Redis est configuré avec `maxmemory-policy noeviction` dans docker-compose et Railway pour garantir la fiabilité de BullMQ et du pub/sub

### Observabilité OpenTelemetry

- [x] **OBS-01**: Le `docker-compose.yml` inclut un service OpenTelemetry Collector configuré pour recevoir OTLP (grpc + http) et exporter vers une destination externe (config exporters, destination TBD)
- [x] **OBS-02**: `apps/api` initialise le SDK OTel (`@opentelemetry/sdk-node`) avant tout import de package interne — traces HTTP, spans DB (Drizzle), logs structurés exportés en OTLP
- [x] **OBS-03**: `apps/web` initialise le SDK OTel côté serveur (SSR/loader) — traces de navigation, erreurs capturées, logs exportés en OTLP
- [x] **OBS-04**: PostHog est conservé pour les analytics produit (événements utilisateur) mais les logs et traces passent par OTel Collector uniquement
- [x] **OBS-05**: Un test de fumée (DB span visible dans le collector) valide l'ordre d'initialisation OTel avant de considérer la phase complète

### Déploiement Railway

- [x] **DEPLOY-01**: Chaque service (`apps/api`, `apps/web`) a un Dockerfile multi-stage utilisant `turbo prune --scope=<app> --docker` pour produire une image minimale
- [x] **DEPLOY-02**: Les services Railway ont leurs `Root Directory` et `Watch Paths` correctement configurés — un changement dans `packages/` déclenche le redéploiement des apps qui en dépendent
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
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| PKG-01 | Phase 1 | Complete |
| PKG-02 | Phase 1 | Complete |
| PKG-03 | Phase 1 | Complete |
| PKG-04 | Phase 1 | Complete |
| API-01 | Phase 2 | Complete |
| API-02 | Phase 2 | Complete |
| API-03 | Phase 2 | Complete |
| API-04 | Phase 2 | Complete |
| API-05 | Phase 2 | Complete |
| API-06 | Phase 2 | Complete |
| API-07 | Phase 2 | Complete |
| API-08 | Phase 2 | Complete |
| AUTH-01 | Phase 3 | Complete |
| AUTH-02 | Phase 3 | Complete |
| AUTH-03 | Phase 3 | Complete |
| AUTH-04 | Phase 3 | Complete |
| AUTH-05 | Phase 3 | Complete |
| AUTH-06 | Phase 3 | Complete |
| WEB-01 | Phase 4 | Complete |
| WEB-02 | Phase 4 | Complete |
| WEB-03 | Phase 4 | Complete |
| WEB-04 | Phase 4 | Pending |
| WEB-05 | Phase 4 | Complete |
| WEB-06 | Phase 4 | Complete |
| WEB-07 | Phase 4 | Complete |
| REAL-01 | Phase 5 | Complete |
| REAL-02 | Phase 5 | Complete |
| REAL-03 | Phase 5 | Complete |
| REAL-04 | Phase 5 | Complete |
| OBS-01 | Phase 6 | Complete |
| OBS-02 | Phase 6 | Complete |
| OBS-03 | Phase 6 | Complete |
| OBS-04 | Phase 6 | Complete |
| OBS-05 | Phase 6 | Complete |
| DEPLOY-01 | Phase 7 | Complete |
| DEPLOY-02 | Phase 7 | Complete |
| DEPLOY-03 | Phase 7 | Pending |
| DEPLOY-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 39/39 ✓
- Unmapped: 0

---

*Requirements defined: 2026-03-18*
*Last updated: 2026-03-24 — v1.1 requirements added*

---

## v1.1 Requirements

Scope: UI parity restoration, shared shadcn/ui package, Turborepo micro-frontend infrastructure, admin SPA migration (exact feature parity with ../website admin), Caddy production reverse proxy.

### Shared UI Package

- [x] **UI-01**: L'utilisateur peut utiliser n'importe quel composant shadcn depuis `@kubeasy/ui` — les 17 composants sont migrés depuis `apps/web/src/components/ui/`, exportés en TypeScript source (JIT, pas de build step)
- [x] **UI-02**: Chaque app consommatrice importe les design tokens CSS depuis `packages/ui/src/styles/tokens.css` — les variables `:root` (couleurs, radius, etc.) sont définies une seule fois
- [x] **UI-03**: `apps/web` importe tous ses composants UI depuis `@kubeasy/ui` — le dossier `apps/web/src/components/ui/` est supprimé
- [x] **UI-04**: `react` et `react-dom` sont déclarés en `peerDependencies` dans `packages/ui/package.json` — `pnpm ls react` confirme une seule instance React par app
- [x] **UI-05**: La config Tailwind v4 de `apps/web` et `apps/admin` inclut `@source` pointant vers `packages/ui/src` — les classes Tailwind du package partagé apparaissent dans le CSS généré

### UI Parity

- [x] **PARITY-01**: Les pages blog (liste + articles) de `apps/web` correspondent visuellement à `../website` — typographie, spacing, layout, couleurs, composants
- [x] **PARITY-02**: Les pages marketing (landing, pricing, about) de `apps/web` correspondent visuellement à `../website`
- [x] **PARITY-03**: Les pages challenges (liste + détail) de `apps/web` correspondent visuellement à `../website`
- [x] **PARITY-04**: Les pages dashboard et profil de `apps/web` correspondent visuellement à `../website`

### Micro-Frontend Infrastructure

- [ ] **MFE-01**: Un fichier `microfrontends.json` à la racine configure le proxy Turborepo — `apps/web:3000` (catch-all), `apps/api:3001` (`/api`), `apps/admin:3002` (`/admin`) — accessible sur `localhost:3024`
- [ ] **MFE-02**: Les scripts dev de `apps/web`, `apps/api`, `apps/admin` utilisent `$TURBO_MFE_PORT` pour écouter sur le port injecté par le proxy Turborepo
- [ ] **MFE-03**: Le `Caddyfile` dans `apps/caddy` route `kubeasy.dev/*` → `apps/web`, `/api/*` → `apps/api` (`flush_interval -1` pour SSE), `/admin/*` → `apps/admin`, avec `auto_https off`
- [ ] **MFE-04**: `apps/caddy` est déployé comme service Railway séparé avec son Dockerfile — le custom domain `kubeasy.dev` est transféré sur ce service
- [ ] **MFE-05**: `API_URL` dans `apps/api` est mis à jour vers `https://kubeasy.dev` après cutover Caddy — les OAuth redirect URIs (GitHub, Google, Microsoft) sont mis à jour

### Admin App — Scaffold & Auth

- [ ] **ADMIN-01**: `apps/admin` est une SPA Vite + React client-side avec TanStack Router, `base: "/admin/"` dans `vite.config.ts` et `basename="/admin"` dans le router — `vite build && vite preview` vérifié
- [ ] **ADMIN-02**: Route guard admin — session via Better Auth client (`credentials: "include"`), redirect vers `kubeasy.dev` si utilisateur non-admin

### Admin App — Challenges Page (/admin/challenges)

- [ ] **ADMIN-03**: L'utilisateur admin voit 4 stats cards challenges — completion rate, success rate, total submissions, avg attempts (labels et calculs identiques à `../website`)
- [ ] **ADMIN-04**: L'utilisateur admin voit la table de tous les challenges avec les colonnes : title, theme, type, difficulty, created date, completion %, success rate %, toggle available
- [ ] **ADMIN-05**: L'utilisateur admin peut activer/désactiver un challenge via un toggle (optimistic update + gestion d'erreur)

### Admin App — Users Page (/admin/users)

- [ ] **ADMIN-06**: L'utilisateur admin voit 4 stats cards utilisateurs — total users, active, banned, admins count
- [ ] **ADMIN-07**: L'utilisateur admin voit la table paginée des utilisateurs (50/page) avec : avatar+nom+email, rôle badge, challenges complétés, XP total, date inscription, statut (actif/banni+raison)
- [ ] **ADMIN-08**: L'utilisateur admin peut changer le rôle d'un utilisateur (Make admin / Remove admin) via le menu dropdown
- [ ] **ADMIN-09**: L'utilisateur admin peut bannir un utilisateur avec une raison optionnelle (dialog de confirmation) et débannir un utilisateur banni
- [ ] **ADMIN-10**: La table affiche les utilisateurs bannis avec apparence atténuée (faded) et une protection anti-self-action (ne peut pas se bannir/changer son propre rôle)

### Admin API — Hono Endpoints (à ajouter dans apps/api)

- [ ] **ADMIN-11**: `GET /api/admin/challenges` retourne tous les challenges avec métriques (starts, completions, submissions, successful submissions)
- [ ] **ADMIN-12**: `GET /api/admin/challenges/stats` retourne les stats globales challenges (totalSubmissions, successfulSubmissions, successRate, totalStarts, totalCompletions, completionRate)
- [ ] **ADMIN-13**: `GET /api/admin/users` retourne la liste paginée des utilisateurs avec métriques (completedChallenges, totalXp, banned, banReason, role, createdAt)
- [ ] **ADMIN-14**: `GET /api/admin/users/stats` retourne les stats globales utilisateurs (total, active, banned, admins)
- [ ] **ADMIN-15**: `PATCH /api/admin/users/:id/ban` bannit un utilisateur (raison optionnelle) — interdit le self-ban
- [ ] **ADMIN-16**: `PATCH /api/admin/users/:id/unban` débanit un utilisateur
- [ ] **ADMIN-17**: `PATCH /api/admin/users/:id/role` modifie le rôle d'un utilisateur (`admin` | `user`) — interdit le self-role-change

### Admin Deployment

- [ ] **ADMIN-18**: `apps/admin` est déployé comme service Railway séparé avec son propre Dockerfile (pattern `turbo prune --docker`)

---

## v2 Requirements (Deferred from v1.1)

- **ADMIN-DEF-01**: Admin submissions view (per user/challenge) — trop de complexité pour v1.1
- **ADMIN-DEF-02**: Admin analytics dashboard (PostHog integration)
- **ADMIN-DEF-03**: Challenge import UI (sync depuis GitHub challenges repo via UI)

---

## Traceability (v1.1)

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01 | Phase 8 | Complete |
| UI-02 | Phase 8 | Complete |
| UI-03 | Phase 8 | Complete |
| UI-04 | Phase 8 | Complete |
| UI-05 | Phase 8 | Complete |
| PARITY-01 | Phase 9 | Complete |
| PARITY-02 | Phase 9 | Complete |
| PARITY-03 | Phase 9 | Complete |
| PARITY-04 | Phase 9 | Complete |
| MFE-01 | Phase 10 | Pending |
| MFE-02 | Phase 10 | Pending |
| ADMIN-01 | Phase 10 | Pending |
| ADMIN-02 | Phase 10 | Pending |
| ADMIN-03 | Phase 11 | Pending |
| ADMIN-04 | Phase 11 | Pending |
| ADMIN-05 | Phase 11 | Pending |
| ADMIN-06 | Phase 11 | Pending |
| ADMIN-07 | Phase 11 | Pending |
| ADMIN-08 | Phase 11 | Pending |
| ADMIN-09 | Phase 11 | Pending |
| ADMIN-10 | Phase 11 | Pending |
| ADMIN-11 | Phase 11 | Pending |
| ADMIN-12 | Phase 11 | Pending |
| ADMIN-13 | Phase 11 | Pending |
| ADMIN-14 | Phase 11 | Pending |
| ADMIN-15 | Phase 11 | Pending |
| ADMIN-16 | Phase 11 | Pending |
| ADMIN-17 | Phase 11 | Pending |
| ADMIN-18 | Phase 12 | Pending |
| MFE-03 | Phase 12 | Pending |
| MFE-04 | Phase 12 | Pending |
| MFE-05 | Phase 12 | Pending |

**Coverage v1.1:**
- v1.1 requirements: 32 total
- Mapped to phases: 32/32 ✓
- Unmapped: 0
