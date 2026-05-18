# Kubeasy

A platform where developers learn Kubernetes by solving realistic, broken-cluster scenarios — not tutorials. Users apply fixes against a real local cluster; the CLI validates results and submits them to the API.

## Language

### Challenges

**Challenge**:
A self-contained Kubernetes learning scenario with a broken initial state. Users diagnose and fix it using standard `kubectl` tooling.
_Avoid_: exercise, tutorial, lab, problem.

**Slug**:
The kebab-case unique identifier for a Challenge (e.g. `pod-evicted`). The slug is the primary key across CLI, API, and registry — not a numeric ID.
_Avoid_: id, name, identifier.

**Manifest**:
The tar.gz archive of Kubernetes YAML files that represents the initial broken state of a Challenge. Applied to the local Kind cluster when a user starts a challenge.
_Avoid_: template, resources, fixtures.

**Theme**:
A broad Kubernetes topic that groups related Challenges (e.g. `resources-scaling`, `rbac-security`, `networking`). Used for filtering and measuring learning breadth.
_Avoid_: category, topic, tag.

**Type**:
The nature of the task a Challenge asks the user to perform. One of: `fix` (repair broken state), `build` (create something), `migrate` (update config to a new pattern).
_Avoid_: mode, kind, category.

**Difficulty**:
The estimated learning effort for a Challenge. One of: `easy`, `medium`, `hard`.
_Avoid_: level, tier.

---

### Validation

**Objective**:
A single pass/fail check that verifies one aspect of the user's solution (e.g. "Pod is Ready", "No OOMKilled events"). A Challenge has one or more Objectives; the user must pass all of them.
_Avoid_: **validation** (legacy term still present in some code — standardise on Objective), check, criterion, step.

**Objective Key**:
A short kebab-case identifier for an Objective within a Challenge (e.g. `pod-ready-check`). Stable across CLI and API; used as the primary key in submission payloads.
_Avoid_: id, name.

**Objective Type**:
The execution strategy for an Objective. One of: `status`, `log`, `event`, `connectivity`, `rbac`, `condition`, `spec`, `triggered`.

---

### Submissions & Progress

**Submission**:
A user's recorded attempt at solving a Challenge. Contains the pass/fail result of every Objective and metadata (attempt number, timestamp). Multiple Submissions per Challenge per User are allowed.
_Avoid_: attempt, result, answer.

**Attempt Number**:
A sequential counter (1, 2, 3…) tracking how many times a User has submitted for a given Challenge. Resets on challenge replay.
_Avoid_: retry count, version.

**Progress**:
The per-user, per-Challenge lifecycle state. One of: `not_started`, `in_progress`, `completed`. Distinct from a Submission — a User has one Progress record per Challenge but many Submissions.
_Avoid_: status (too generic in this context — say "progress status" or just the value).

---

### XP & Ranking

**XP** (Experience Points):
The numeric currency earned by completing Challenges. Drives Rank and league position.
_Avoid_: points, score, coins.

**XP Transaction**:
An immutable audit record of a single XP award. Has an action type (`challenge_completed`, `daily_streak`, `first_challenge`, `milestone_reached`, `bonus`), an amount, and an optional Challenge reference.
_Avoid_: XP event, XP log entry.

**Rank**:
The user's tier derived from their total XP (e.g. Novice, Apprentice, Expert). Has a display name, current XP threshold, and next-rank threshold.
_Avoid_: level, tier, badge.

**Streak**:
The count of consecutive days on which a User has completed at least one Challenge. A broken day resets it to zero.
_Avoid_: daily count, combo.

---

### Infrastructure

**Audit Event**:
A K8s API mutating operation (create, update, patch, delete) recorded during a challenge attempt. Stored as JSONB on the Submission. Used for user-facing reasoning path display, LLM feedback, and admin fraud/blocker detection. Read operations (get, logs, describe) are excluded.
_Avoid_: kubectl event, audit log, command history.

**CLI Event**:
A CLI lifecycle event (`cli_login`, `cli_setup`) captured server-side with CLI metadata (version, OS, arch). Stored append-only for admin analytics on CLI adoption and version spread.
_Avoid_: CLI analytics, CLI tracking.

**Registry**:
The remote service (`registry.kubeasy.dev`) that hosts all Challenge YAML definitions and Manifests. The API proxies registry requests; clients never call the Registry directly.
_Avoid_: store, repository (ambiguous with git), content server.

**Onboarding**:
The multi-step wizard guiding new users from account creation through CLI auth, cluster setup, and first Challenge attempt. Tracks completion of each milestone (`hasApiToken`, `cliAuthenticated`, `clusterInitialized`, `hasStartedChallenge`, `hasCompletedChallenge`).
_Avoid_: setup, wizard, getting-started flow.

## Relationships

- A **Challenge** belongs to exactly one **Theme**, one **Type**, and one **Difficulty**
- A **Challenge** has one or more **Objectives** (all must pass for completion)
- A **Challenge** has exactly one **Manifest**
- A **User** has one **Progress** record per **Challenge**
- A **User** has many **Submissions** per **Challenge** (one per attempt)
- A **Submission** contains one result per **Objective** in the **Challenge**
- A **User** accumulates **XP** via **XP Transactions**; total XP determines **Rank**
- A **User** has exactly one **Onboarding** record

## Example dialogue

> **Dev:** "When a User submits, do we update their Progress immediately?"
> **Domain expert:** "Yes — if all Objectives pass, Progress moves to `completed`. But we always create a Submission record regardless of whether they passed."

> **Dev:** "Can a User re-attempt a completed Challenge?"
> **Domain expert:** "Yes. The Attempt Number increments and XP is not re-awarded, but Progress stays `completed` and a new Submission is recorded."

## Flagged ambiguities

- **Objective vs. Validation**: both terms appear in the codebase (`validation` in older CLI/YAML code, `objective` in the API and DB). Resolved: **Objective** is canonical. When editing older code, migrate to Objective.
- **Slug** (challenge) vs. **themeSlug**: a raw `slug` always refers to a Challenge slug; use `themeSlug` explicitly when referring to a Theme identifier.
