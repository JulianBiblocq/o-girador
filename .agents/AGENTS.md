# Custom Rules

## Explicit Validation Request
L'utilisateur a demandé que les plans d'implémentation nécessitent toujours une validation explicite de sa part, même s'il a activé une politique de validation automatique (Auto-Approval) globale dans le système Antigravity.
Par conséquent :
- Lorsque tu présentes un plan d'implémentation (via l'artefact `implementation_plan.md`), NE TE CONTENTE PAS du feu vert automatique du système.
- Ajoute explicitement dans ta réponse textuelle : "Veuillez me confirmer par un message écrit que vous validez ce plan avant que je ne commence."
- Refuse d'exécuter le plan tant que l'utilisateur n'a pas répondu "ok", "vas-y", ou tout autre message confirmant son accord, MÊME SI l'événement "auto-approved" est déclenché.

## Frontend Performance & DOM Optimization Rules (4 Commandements Absolus)

**Rôle** : Ingénieur Staff Frontend, expert absolu en Performance Web, React 19, Zustand et Web Audio API. L'objectif est de concevoir des applications musicales temps-réel avec un framerate strict de 60 FPS sur tablette, sans jamais bloquer le Main Thread JavaScript ni désynchroniser l'horloge audio.

### Les 4 Commandements Absolus (Red Lines) :

1. **Zero Render Thrashing** : Interdiction d'utiliser `useState` ou des mutations Zustand pour des animations liées à des événements haute fréquence (ex : ticks audio ou `requestAnimationFrame`). Utiliser exclusivement des `useRef` et la mutation directe du DOM (Vanilla JS) en dehors du cycle React.
2. **Zero Layout Thrashing** : Traquer impitoyablement les lectures synchrones du DOM (`offsetHeight`, `getBoundingClientRect`, etc.) combinées à des mutations dans la même trame.
3. **Priorité GPU (WAAPI)** : Bannir les transitions CSS modifiant la géométrie (`width`, `height`, top, left, etc.). Utiliser uniquement l'API native Web Animations (`element.animate()`) avec `transform` et `opacity`.
4. **Zustand "ID-Only"** : Un composant parent affichant une liste ne doit récupérer QUE les IDs via `useShallow`. Il ne passe aucun callback de mutation en props. Chaque composant enfant récupère ses propres données et actions depuis le store via son ID.

Si du code est généré ou modifié, ces règles doivent être strictement respectées avec une brève justification de l'impact des choix sur le CPU (Reflow/Paint) et le Thread audio.

## 5. Déploiement (Pense-bête)

**Rappel Important** : N'oublie pas de TOUJOURS faire un build et déployer sur Firebase Hosting (via la commande `npm run deploy`) après avoir commité et pushé des modifications liées au séquenceur.

---
### 🛡️ Gouvernance Centralisée des Règles Firebase & Sécurité (Strict)
- **Autorité unique :** Les règles d'accès (`firestore.rules` et `storage.rules`) sont exclusivement pilotées, modifiées et déployées par le projet maître (**Orchestrad'Or** / backend commun).
- **Interdiction formelle dans cette application :** 
  * Ne jamais créer, modifier ou valider de fichier local `firestore.rules` ou `storage.rules`.
  * Ne jamais exécuter de commande de déploiement de règles (`firebase deploy --only firestore:rules` ou `storage` formellement proscrits).
- **Développement client :** Les requêtes Firestore et Storage doivent impérativement s'adapter aux modèles de permissions et collections existants sans exiger d'altération des règles de sécurité depuis ce dépôt.

---
## 6. Règles Architecturales Permanentes

### A. Règle Anti-Monolithe (Modularité & Extraction Immédiate)
- **Seuil de 30 lignes** : Toute nouvelle fonctionnalité, enrichissement de logique ou retouche dépassant 30 lignes de code (logique, hooks ou JSX) doit faire l'objet d'une extraction immédiate hors des composants existants déjà denses (ex: `TimelineSequencer.tsx`, `useSequencerStore.ts`, `DawTrackRow.tsx`, etc.).
- **Découpage systématique** : Extraire obligatoirement vers des sous-composants spécialisés (dans un sous-dossier de composant ou `src/components/...`), des custom hooks (`src/hooks/...`) ou des modules utilitaires purs (`src/utils/...`). Interdiction d'empiler du code monolithique dans les fichiers conteneurs.

### B. Découplage Graphique Multi-Univers (Design Tokens Sémantiques)
- **Bannir les styles en dur** : Interdiction formelle d'écrire des valeurs de couleur ou styles hardcodés (ex: `#f4ecd8`, `#1a1a1a`, `#8b2a1a`, etc.) dans les attributs `style={{ ... }}` ou les classes utilitaires statiques.
- **Usage des jetons sémantiques** : Utiliser exclusivement les variables CSS et jetons sémantiques (`var(--cordel-bg)`, `var(--cordel-text)`, `var(--cordel-border)`, `themeTokens.css`, etc.) afin de garantir la cohérence graphique et le basculement instantané entre les différents univers visuels de l'application (Cordel, Dark mode, thèmes dynamiques).

### C. Commandements de Performance Web Audio & Temps-Réel
- **Zero Render Thrashing** : Proscription totale de `useState` et des mutations de store réactives pour les événements audio haute fréquence (ticks, curseur de lecture, RAF). Recourir exclusivement à des `useRef`, des écouteurs d'événements directs ou la manipulation DOM découplée (Vanilla JS).
- **Sélecteurs Zustand "ID-Only"** : Les composants conteneurs ne s'abonnent qu'aux listes d'IDs (`useShallow(state => state.trackIds)`). Chaque sous-composant enfant récupère ses données et actions atomiquement via son propre ID pour éliminer les cascades de re-render.
- **Gestion du Graphe & Nettoyage des Nœuds Tone.js / Web Audio** : Tout nœud audio Tone.js ou Web Audio créé dynamiquement doit être explicitement déconnecté et détruit (`node.disconnect()`, `node.dispose()`) au démontage du composant ou lors du changement de preset afin de garantir l'absence absolue de fuite mémoire et de maintenir 60 FPS constants.

### D. Vérification Locale Obligatoire Avant Toute Validation
- **Contrôle systématique avant validation** : Avant de déclarer une tâche achevée ou de solliciter la validation, l'agent doit impérativement exécuter et valider localement :
  1. `cmd /c "npx tsc --noEmit"` : 0 erreur TypeScript.
  2. `cmd /c "npm run build"` : compilation Vite de production réussie.
- **Tolérance zéro** : Aucune tâche ne peut être considérée comme terminée si l'une de ces deux commandes échoue.
