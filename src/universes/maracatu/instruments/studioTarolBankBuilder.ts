/**
 * studioTarolBankBuilder.ts — Banque Studio 53 WAV dédiée `Tarol` sans collision Legacy (< 40 lignes).
 * - Préfixe `Tarol studio` préservant 100 % des 16 fichiers `public/Mixdown/Tarol *.ogg` provisoires.
 * - Vraies prises dédiées `d`, `e` (x6) et `r` (`r_min` x5) à vélocité nominale `1.0` et `pitchNuance = 1.0`.
 * - `A` / `F` nominaux (`1.0`, x5), `a` / `f` modérés (`0.82`), `X` / `C` (x4) et `B/b` sur `Tarol studio B 1.ogg`.
 */

import {
  buildBarulhoStrokePair,
  buildDedicatedStroke,
  buildStudioFiles,
  buildVirtualWeakStroke,
} from './studioStrokeFactory';
import { StrokeMapping } from './types';

export function buildStudioTarolStrokes(): StrokeMapping[] {
  const p = 'Tarol studio';
  const rimPool = buildStudioFiles(p, 'A', 5);
  const flaPool = buildStudioFiles(p, 'F', 5);
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
    ...buildBarulhoStrokePair(`Mixdown/${p} B 1.ogg`),
  ];
}
