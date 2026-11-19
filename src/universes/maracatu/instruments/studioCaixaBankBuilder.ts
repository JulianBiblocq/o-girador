/**
 * studioCaixaBankBuilder.ts — Banque Studio 52 WAV dédiée `Caixa` sans collision Legacy (< 40 lignes).
 * - Préfixe `Caixa studio` préservant 100 % des 16 fichiers `public/Mixdown/Caixa *.ogg` provisoires.
 * - `A` / `F` nominaux (`1.0`), `a` / `f` modérés (`0.82`), `5` prises `R` / `r_min`, `4` prises `C`, `B/b` sur `Caixa studio B.ogg`.
 */

import {
  buildBarulhoStrokePair,
  buildDedicatedStroke,
  buildStudioFiles,
  buildVirtualWeakStroke,
} from './studioStrokeFactory';
import { StrokeMapping } from './types';

export function buildStudioCaixaStrokes(): StrokeMapping[] {
  const p = 'Caixa studio';
  const rimPool = buildStudioFiles(p, 'A', 5);
  const flaPool = buildStudioFiles(p, 'F', 4);
  return [
    buildDedicatedStroke('D', buildStudioFiles(p, 'F D', 6)),
    buildDedicatedStroke('E', buildStudioFiles(p, 'F E', 6)),
    buildDedicatedStroke('d', buildStudioFiles(p, 'f_min d', 6)),
    buildDedicatedStroke('e', buildStudioFiles(p, 'f_min e', 6)),
    buildDedicatedStroke('A', rimPool, ['A'], true),
    buildVirtualWeakStroke('a', rimPool),
    buildDedicatedStroke('R', buildStudioFiles(p, 'R', 5)),
    buildDedicatedStroke('r', buildStudioFiles(p, 'r_min', 5)),
    buildDedicatedStroke('F', flaPool, ['F'], true),
    buildVirtualWeakStroke('f', flaPool),
    buildDedicatedStroke('X', buildStudioFiles(p, 'X', 4), ['X', 'x'], false),
    buildDedicatedStroke('C', buildStudioFiles(p, 'C', 4), ['C', 'c'], false),
    ...buildBarulhoStrokePair(`Mixdown/${p} B.ogg`),
  ];
}
