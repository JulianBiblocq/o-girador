---
trigger: always_on
---
# 02 — Gouvernance SSOT Firebase, Isolation Cloud Functions & Ports Locaux

## 1. Autorité Unique SSOT Firebase (`o-girador-7828c`)
- **Orquestrador** (`o-girador-orquestrador`) est l'**unique source de vérité (SSOT)** autorisée à détenir, modifier, tester et déployer `firestore.rules` et `storage.rules`.
- **Interdictions absolues dans les dépôts satellites** (`o-girador-organizador`, `o-girador-sequenciador`, `o-girador-vocal-lab`, `o-girador-dancador`) :
  * Ne jamais créer, copier ni archiver de fichier `*firestore*.rules*` ou `*storage*.rules*` (même sous suffixe `.DEPRECATED` ou dans `scratch/`).
  * Ne jamais déclarer les clés `"firestore"` ou `"storage"` dans un `firebase.json` satellite.
  * Ne jamais exécuter de `firebase deploy` sans flag explicite `--only`, ni de déploiement ciblant `firestore` ou `storage` hors de `o-girador-orquestrador`.

## 2. Protection Anti-Collision des Cloud Functions
- Le projet Firebase `o-girador-7828c` héberge des Cloud Functions issues de deux dépôts :
  * `o-girador-organizador` (`"codebase": "default"` — SSR Mostrador `serveDynamicApp`, webhooks Stripe/HelloAsso, notifications).
  * `o-girador-orquestrador` (`"codebase": "orquestrador"` — `getCrossAppAuthToken`, `telemetry`, `adminCreateGuestUser`, `calculateAssociationStorageUsage`).
- **Règle stricte de déploiement** : tout appel générique non qualifié `firebase deploy --only functions` est **bloqué** par `pre_command_ssot_guard.mjs`. Toujours qualifier la codebase ou les fonctions exactes (`firebase deploy --only functions:orquestrador` ou `firebase deploy --only functions:nomFonction`).

## 3. Cartographie Stricte des Ports Locaux (`strictPort: true`)
| Application | Dépôt | Port Local | Statut |
| :--- | :--- | :--- | :--- |
| **Orquestrador** | `o-girador-orquestrador` | `5170` | Actif (`strictPort: true`) |
| **Sequenciador** | `o-girador-sequenciador` | `5174` | Actif (`strictPort: true`) |
| **Organizador** & **Mostrador** | `o-girador-organizador` | `5175` | Actif (`strictPort: true`) |
| **Dançador** | `o-girador-dancador` | `5176` | Actif (`strictPort: true`) |
| **Cantador** | `o-girador-vocal-lab` | `5177` | Actif (`strictPort: true`) |
| **Afinador** | `o-girador-afinador` | `5178` | **Réservé** (en conception, `enabled: false`) |

- Interdiction formelle de modifier un port local sans instruction écrite explicite. Si un port est occupé, arrêter le processus résiduel plutôt que d'incrémenter le port.
