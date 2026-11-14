---
trigger: always_on
---
# 03 — Étanchéité SaaS Multi-Univers, Contrat Afinador & Grammaire Vocale v2

## 1. Étanchéité SaaS & Marque Blanche
- **Zéro adhérence en dur au groupe pilote (`samambaia`)** :
  * Ne jamais injecter `'samambaia'` / `'Samambaia'` par défaut dans les requêtes Firestore (`where('groupId', 'in', ...)`), ni utiliser de test partiel `.includes('sam')` (qui entre en collision avec les groupes `samba` et `sambareggae`).
  * Ne jamais coder en dur d'UID Mestre, de logo de troupe ou de nom de groupe dans les composants, manifestes ou modales partagés.
- **Identifiants d'univers normalisés** : utiliser les clés canoniques `maracatu | batucada | sambareggae | samba | capoeira` et résoudre les libellés métiers depuis la configuration du groupe (`/associations/{groupId}`).
- **Sous-domaines réservés** : inclure systématiquement `orquestrador`, `organizador`, `sequenciador`, `cantador`, `dancador`, `mostrador`, `afinador`, `www`, `app`, `admin`, `api` dans les listes `reservedSubdomains`.

## 2. Réservation Silencieuse d'Afinador & Contrat Acoustique (`referencePitchHz`)
- **Drapeau inactif strict (`enabled: false`, `comingSoon: true`)** : tant qu'**Afinador** (`o-girador-afinador`, port réservé `5178`) n'est pas développé, aucun menu, lanceur d'applications ou pied de page ne doit afficher de lien actif ni de bouton fantôme vers Afinador.
- **Contrat acoustique `referencePitchHz?: number` (fallback `440`)** :
  * Utiliser exclusivement la clé numérique **`referencePitchHz`** (bornée `[415, 466]`, valeur par défaut `440`) sur `/associations/{groupId}`, `/documents`, `/toada_packs` et `/presets`.
  * **Ne jamais écraser `referencePitch: string`** dans **Cantador**, qui désigne déjà la note tonique scientifique de référence (`'C4'`, `'A3'`).

## 3. Grammaire Vocale Unifiée (`grammarVersion: 2`)
Entre **Organizador**, **Cantador** et **Sequenciador**, chaque symbole possède un rôle unique et sans collision :
- **`0` (et badge visuel `𝄽`)** : Silence vocal explicite (temps muet ou soupir explicite ; jamais de suppression d'ancre par la touche `0` ni d'activation de pas en `C4`).
- **`_`** : Tenue de voyelle / Mélisme legato (prolongation ou changement de hauteur sur la même syllabe **sans ré-attaque**).
- **`/`** : Soudure de durée à cheval sur deux temps (`4/4`, `1/4/3`) et préfixe de mesure liée en début de ligne (analysé après protection des signatures `[sig:4/4]` et accords `[G/B]`).
- **`-`** : Coupe syllabique à l'intérieur d'un même mot (`MAR- CA- ÇÃO`) dans les grilles et l'Atelier Papier (ne jamais utiliser `-` isolé pour coder une tenue ou un mélisme en `v2`).
- **`'`** : Élision vocalique chantée sur une même subdivision (`E'O`, `d'água`), normalisée en apostrophe ASCII `'`.
- **`───`** : Extension visuelle pure de durée iso-hauteur dans les grilles UI et feuilles imprimées (toujours filtrée hors des vues karaoké et extractions de paroles).
- **`<u>` dans `parolesOriginales` (Règle définitive)** : Conservé comme **marqueur du début de chaque syllabe** (`<u>m</u>ar<u>c</u>a<u>ç</u>ão`), en correspondance bijective `1:1` avec le tiret `-` (`MAR- CA- ÇÃO`) de l'Atelier Papier, afin de préserver un texte fluide sans tirets sur les fiches élèves du Varal (le Temps 1 étant déjà porté par `[1]` / `[M1•1]`).
