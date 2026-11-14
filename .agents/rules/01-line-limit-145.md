---
trigger: glob
globs: "**/src/**/*.js, **/src/**/*.jsx, **/src/**/*.ts, **/src/**/*.tsx, **/src/**/*.mjs, **/src/**/*.css"
---
# 01 — Plafond Strict `< 145 Lignes` & Mode Cliquet Anti-Monolithe (`src/`)

## 1. Formule Unique de Comptage des Lignes Réelles
Dans l'ensemble des dépôts de l'écosystème **O Girador**, le nombre de lignes d'un fichier est mesuré par la formule normalisée :
```js
const realLines = content.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length;
```

## 2. Plafond Strict `< 145 Lignes` (Maximum 144 lignes réelles)
- **Tout nouveau fichier créé dans `src/`** doit impérativement compter **moins de 145 lignes réelles** (`<= 144` lignes).
- **Tout fichier existant déjà conforme (`< 145` lignes)** ne peut en aucun cas franchir ou atteindre le seuil de `145` lignes lors d'une modification (`newLines < 145`).
- Dès qu'un composant, hook ou utilitaire approche de `130–140` lignes, extraire immédiatement la sous-logique autonome dans un module dédié (`src/components/...`, `src/hooks/...`, `src/utils/...`).

## 3. Mode Cliquet Strict (Ratchet) sur la Dette Legacy (`>= 145 Lignes`)
- Lorsqu'une intervention cible un fichier legacy existant dépassant déjà `144` lignes :
  1. **Croissance interdite (`newLines <= oldLines`)** : le hook `pre_write_guard.mjs` bloque automatiquement toute édition qui augmente le nombre de lignes du fichier.
  2. **Protocole Boy-Scout obligatoire** : extraire d'abord une sous-brique cohérente dans un nouveau fichier `< 145` lignes pour faire baisser la taille du monolithe, puis appliquer l'évolution demandée.
- **Exception unique** : les purs dictionnaires de traductions monolithiques historiques (`src/locales/*.js`, `src/locales/*.ts`, `src/locales/*.json`) sont exemptés du compteur de lignes tant que leur découpage par domaine n'est pas engagé, mais demeurent soumis aux gardes lexicaux (Règle 0, interdiction de `Bateria` en Maracatu et de `IA` dans l'UI).
