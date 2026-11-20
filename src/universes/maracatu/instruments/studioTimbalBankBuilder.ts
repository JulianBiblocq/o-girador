/**
 * studioTimbalBankBuilder.ts — Banque Studio 89 WAV dédiée `Timbal` sans collision Legacy (< 45 lignes).
 * - Préfixe `Timbal studio` préservant 100 % des 31 fichiers `public/Mixdown/Timbal *.ogg` provisoires.
 * - Mains Droite (`D`) et Gauche (`E`) dédiées à `baseGain: 1.0` sur `G/g`, `A/a`, `S/s`, `T/t`, `D/d`, `P/p` (6 prises chacune).
 * - `F` / `V` nominaux (`1.0`), `f` / `v` modérés (`0.82`) sur 6 prises, `C` (4 prises) et `B/b` sur `Timbal studio B 1.ogg`.
 */

import {
  buildBarulhoStrokePair,
  buildDedicatedStroke,
  buildStudioFiles,
  buildVirtualWeakStroke,
} from './studioStrokeFactory';
import { StrokeMapping } from './types';

export function buildStudioTimbalStrokes(): StrokeMapping[] {
  const p = 'Timbal studio';
  const fPool = buildStudioFiles(p, 'F', 6);
  const vPool = buildStudioFiles(p, 'V', 6);
  return [
    buildDedicatedStroke('G', buildStudioFiles(p, 'G D', 6)),
    buildDedicatedStroke('g', buildStudioFiles(p, 'G E', 6)),
    buildDedicatedStroke('A', buildStudioFiles(p, 'A D', 6)),
    buildDedicatedStroke('a', buildStudioFiles(p, 'A E', 6)),
    buildDedicatedStroke('S', buildStudioFiles(p, 'S D', 6)),
    buildDedicatedStroke('s', buildStudioFiles(p, 'S E', 6)),
    buildDedicatedStroke('T', buildStudioFiles(p, 'T D', 6)),
    buildDedicatedStroke('t', buildStudioFiles(p, 'T E', 6)),
    buildDedicatedStroke('D', buildStudioFiles(p, 'D D', 6)),
    buildDedicatedStroke('d', buildStudioFiles(p, 'D E', 6)),
    buildDedicatedStroke('P', buildStudioFiles(p, 'P D', 6)),
    buildDedicatedStroke('p', buildStudioFiles(p, 'P E', 6)),
    buildDedicatedStroke('F', fPool, ['F'], true),
    buildVirtualWeakStroke('f', fPool),
    buildDedicatedStroke('V', vPool, ['V'], true),
    buildVirtualWeakStroke('v', vPool),
    buildDedicatedStroke('C', buildStudioFiles(p, 'C', 4), ['C', 'c'], false),
    ...buildBarulhoStrokePair(`Mixdown/${p} B 1.ogg`),
  ];
}
