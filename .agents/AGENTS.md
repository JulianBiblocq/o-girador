# Directives d'Agent — Sequenciador (`o-girador-sequenciador`)

## 0. RÈGLE STRICTE DE NOMMAGE DES APPLICATIONS O GIRADOR
Utiliser exclusivement l'orthographe brésilienne pure (zéro apostrophe, zéro accent français parasite sur `Sequenciador`, zéro majuscule interne avant `-or`, zéro francisation `ch`, cédille obligatoire sur **Dançador**) :
- **O Girador** | **Orquestrador** | **Organizador** | **Sequenciador** | **Cantador** | **Dançador** | **Mostrador** | **Afinador** *(en conception, réservé sous `enabled: false` — aucun lien actif dans les menus utilisateurs)*

## 1. Validation Explicite Obligatoire
Lorsque tu présentes un plan d'implémentation (via `implementation_plan.md`), demande toujours une confirmation écrite explicite de l'utilisateur avant d'exécuter le plan, même si l'auto-approbation est active.

## 2. Frontend Performance & DOM Optimization Rules (4 Commandements Absolus)
**Rôle** : Ingénieur Staff Frontend, expert en Performance Web, React 19, Zustand et Web Audio API (60 FPS constants sur tablette sans jamais désynchroniser l'horloge audio) :
1. **Zero Render Thrashing** : Interdiction de `useState` ou mutations Zustand pour les ticks audio ou `requestAnimationFrame`. Utiliser exclusivement `useRef` et la mutation directe du DOM hors React.
2. **Zero Layout Thrashing** : Proscrire toute lecture géométrique synchrone (`offsetHeight`, `getBoundingClientRect`) combinée à des mutations dans la même trame.
3. **Priorité GPU (WAAPI)** : Bannir les transitions CSS géométriques (`width`, `height`, `top`, `left`). Utiliser uniquement `element.animate()` ou `transform` / `opacity`.
4. **Zustand "ID-Only"** : Un parent de liste ne s'abonne qu'aux IDs via `useShallow`. Chaque enfant récupère ses données et actions via son propre ID.

---
### 🛡️ Gouvernance Centralisée des Règles Firebase & Sécurité (Strict)
- **Autorité unique :** Les règles `firestore.rules` et `storage.rules` sont exclusivement pilotées et déployées par **Orquestrador** (`o-girador-orquestrador`).
- **Interdiction formelle dans ce dépôt :** ne jamais créer, modifier ou déployer de règles Firebase locales (`npm run deploy` cible exclusivement `hosting:sequenceur`).

---
## 3. Règles Architecturales Permanentes

### A. Plafond Strict `< 145 Lignes` & Cohésion Modulaire (Standards DAW Pro)
- **Plafond strict `< 145 lignes` réelles** (`content.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length < 145`, soit 144 lignes max) pour tout fichier dans `src/` (et Mode Cliquet `newLines <= oldLines` sur tout éventuel fichier legacy `>= 145` lignes).
- **Seuil d'extraction de 30 lignes** : toute nouvelle logique dépassant 30 lignes est extraite vers un sous-composant (`src/components/...`), custom hook (`src/hooks/...`) ou module utilitaire pur (`src/utils/...`).

### B. Découplage Graphique Multi-Univers & Lexique Métier
- **Zéro couleur en dur** : utiliser exclusivement les variables CSS sémantiques (`var(--cordel-bg)`, `var(--cordel-text)`, `var(--cordel-border)`, `theme-tokens.css`).
- **Zéro emoji Unicode coloré** : uniquement des composants SVG vectoriels monochromes (`stroke="currentColor"` / `fill="currentColor"`, esthétique Xilogravura).
- **Lexique** : Interdiction absolue du mot `Bateria` dans l'univers Maracatu (`Batuque` / `Baque`) et interdiction du mot `IA` dans l'interface utilisateur.

### C. Standards Studio DAW Pro (Audio & Mémoire)
- Déconnexion et destruction explicite (`.disconnect()`, `.dispose()`) de tout nœud Web Audio / Tone.js créé dynamiquement.
- Graphe audio stable en lecture (aucun recâblage `disconnect`/`connect` à la volée ; lissage sans clic via `rampTo` / `setTargetAtTime` sur 10–30 ms ; *choke groups* isolés par `trackId`).
- Vérité géométrique des calques *Ao Vivo* via `ResizeObserver` découplé hors RAF.

### D. Vérification Locale Obligatoire Avant Validation
1. `cmd /c "npx tsc --noEmit"` : 0 erreur TypeScript.
2. `cmd /c "npm run build"` : compilation Vite de production réussie.

---
## RÈGLE STRICTE DES PORTS LOCAUX (ÉCOSYSTÈME O GIRADOR)
- **Orquestrador** : `5170` | **Sequenciador** : `5174` | **Organizador** / **Mostrador** : `5175` | **Dançador** : `5176` | **Cantador** : `5177` | **Afinador** *(réservé, inactif)* : `5178`
- Interdiction de modifier le port local sans instruction explicite (`strictPort: true` obligatoire).
