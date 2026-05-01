# feat(submit): adopt hardened submission flow (run token + HMAC + version header)

## Context

L'endpoint `/api/challenges/:slug/submit` côté API a été durci dans la branche `claude/secure-submission-endpoint-dR8Qy` (commit `c49882b`, repo `kubeasy-dev/monorepo`). À partir de la mise en production avec `SUBMIT_HARDENED=true`, **toute soumission qui ne respecte pas le nouveau contrat sera rejetée**.

Le CLI doit donc :

1. Annoncer sa version
2. Récupérer un *run token* avant la soumission
3. Signer chaque payload de soumission avec un HMAC dérivé du *nonce* fourni à l'ouverture du run

## Nouveau contrat

### 1. Header obligatoire sur toutes les requêtes vers `/start` et `/submit`

```
X-Kubeasy-CLI-Version: <semver>   # ex: "1.4.0"
```

- Format `MAJOR.MINOR.PATCH` (suffixes pré-release/build tolérés mais ignorés)
- Si `< MIN_CLI_VERSION` côté serveur → `426 Upgrade Required` (le serveur renvoie aussi le `minVersion` requis dans le body)

### 2. Démarrage du run

```
POST /api/cli/challenges/:slug/start
Authorization: Bearer <api-key>
X-Kubeasy-CLI-Version: <semver>
```

Réponse `200` :

```json
{
  "runToken": "<32-char nanoid>",
  "nonce": "<64-char hex>",
  "startedAt": "2026-04-30T12:00:00.000Z",
  "expiresAt": "2026-04-30T13:00:00.000Z"
}
```

À stocker en RAM pour la durée du challenge. Un seul run actif par `(user, slug)` : ouvrir un nouveau `/start` invalide automatiquement le précédent.

Codes d'erreur :

| Code | Cause |
|---|---|
| `401` | non authentifié |
| `404` | challenge inconnu |
| `426` | CLI trop vieux |
| `429` | rate-limit (30/min/user) |

### 3. Soumission

```
POST /api/cli/challenges/:slug/submit
Authorization: Bearer <api-key>
X-Kubeasy-CLI-Version: <semver>
X-Kubeasy-Run-Token: <runToken from /start>
X-Kubeasy-Timestamp: <ms epoch>
X-Kubeasy-Signature: <hex hmac>
Content-Type: application/json
```

Body : inchangé (`SubmitBodySchema` dans `@kubeasy/api-schemas/submissions`).

#### Calcul de la signature

```
signature = HMAC-SHA256(
  key   = nonce,
  data  = runToken + "\n" + timestamp + "\n" + rawBody
).hex()
```

Important :

- **`rawBody` = bytes exacts envoyés sur le wire** (avant tout reformat). Le serveur vérifie sur les bytes reçus.
- `timestamp` = string décimale d'un epoch ms, doit être à ±5 min de l'instant de réception serveur ET ≥ `startedAt` du run.

Référence de l'implémentation Node attendue côté serveur :

```js
crypto.createHmac("sha256", nonce)
      .update(`${runToken}\n${timestamp}\n${rawBody}`)
      .digest("hex")
```

Équivalent Go :

```go
mac := hmac.New(sha256.New, []byte(nonce))
mac.Write([]byte(runToken + "\n" + timestamp + "\n" + rawBody))
hex.EncodeToString(mac.Sum(nil))
```

#### Codes d'erreur ajoutés

| Code | Cause |
|---|---|
| `400` | headers manquants, JSON invalide, timestamp hors fenêtre |
| `401` | run token expiré/inconnu, ou signature invalide |
| `403` | run token ne correspond pas à `(user, slug)` |
| `426` | CLI trop vieux |
| `429` | rate limits (burst, daily cap, cooldown 1/min/slug) |

Sur succès `200` : le run token est révoqué côté serveur (single-use à la complétion). Pour une re-tentative après échec (`422`), réutiliser le même run token tant qu'il n'est pas expiré.

## Travail attendu côté CLI

- [ ] Header `X-Kubeasy-CLI-Version` injecté par défaut sur tous les appels API (pas seulement submit)
- [ ] Nouvelle étape interne : appel à `/start` au début du challenge (à brancher là où on lance la phase de validation)
- [ ] Stockage en mémoire de `runToken` + `nonce` + `expiresAt`
- [ ] Helper `signSubmitBody(nonce, runToken, ts, rawBody) -> hex` (paquet `internal/auth` ou équivalent)
- [ ] Refactor du client HTTP de submit pour :
  - Sérialiser le body **une seule fois** (pour avoir des `rawBody` identiques entre signature et envoi)
  - Ajouter les 3 headers `X-Kubeasy-Run-Token` / `X-Kubeasy-Timestamp` / `X-Kubeasy-Signature`
- [ ] Gestion d'erreurs typées :
  - `426` → message clair, suggérer `kubeasy upgrade`
  - `401 invalid signature` → probablement un bug de sérialisation, log diagnostic
  - `429` → afficher le `Retry-After` renvoyé
- [ ] Bump de version CLI ; coordonner avec `MIN_CLI_VERSION` côté API (la valeur sera fixée à la version qui ship cette feature)

## Test plan

- [ ] Test unitaire : signature déterministe, byte-pour-byte identique au calcul Node de référence
  - Vecteur de test partagé à figer dès que le CLI implémente : `nonce="n"`, `runToken="tok"`, `ts="1"`, `body="body"` → `<hex>`
- [ ] Test d'intégration contre l'API en mode `SUBMIT_HARDENED=true` :
  - happy path : `/start` → `/submit` OK → `/submit` à nouveau fail (token révoqué)
  - re-tentative après échec d'objectifs : `/start` → `/submit` (`validated=false`) → `/submit` même token (OK)
  - signature corrompue → `401`
  - timestamp de -10 min → `400`
  - run token d'un autre slug → `403`
  - sans header version → `400`
  - avec version `0.0.1` (sous le min) → `426`
- [ ] Smoke test contre l'API en mode `SUBMIT_HARDENED=false` : les anciens flows continuent de marcher (warnings serveur seulement) — utile pendant la transition

## Stratégie de rollout

1. CLI ship la version qui supporte le nouveau flow (mais reste rétro-compatible : si headers absents et `SUBMIT_HARDENED=false`, ça passe encore)
2. Ops fixe `MIN_CLI_VERSION` côté API à cette nouvelle version
3. Ops bascule `SUBMIT_HARDENED=true`
4. Les anciennes versions de CLI sont coupées (`426`)

## Liens

- Branche API : `claude/secure-submission-endpoint-dR8Qy`
- Commit : `c49882b`
- Fichiers de référence :
  - `apps/api/src/lib/hmac.ts` — algo de signature
  - `apps/api/src/lib/run-token.ts` — cycle de vie du token
  - `apps/api/src/middleware/submit-guard.ts` — validations côté serveur
  - `apps/api/src/routes/submit.ts` — endpoints `/start` et `/submit`
