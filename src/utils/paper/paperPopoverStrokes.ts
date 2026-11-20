/**
 * Spécification SSOT des frappes par pupitre pour les popovers Papier & Mobile (< 90 lignes).
 * Alignée à 100 % sur src/universes/maracatu/strokes/.
 */

export interface RoleStrokesConfig {
  strong: string[];
  weak: string[];
  special: string[];
}

const ALFAIA_STROKES: RoleStrokesConfig = {
  strong: ['D', 'E', 'A', 'I', 'C', 'X', 'B'],
  weak: ['d', 'e'],
  special: ['D/E', 'd/I', 'e/D', 'A/D'],
};

const CAIXA_STROKES: RoleStrokesConfig = {
  strong: ['D', 'E', 'A', 'R', 'F', 'C', 'X', 'B'],
  weak: ['d', 'e', 'a', 'r', 'f'],
  special: ['D/E', 'E/D', 'A/a'],
};

const ROLE_STROKES_MAP: Record<string, RoleStrokesConfig> = {
  al: ALFAIA_STROKES,
  mc: ALFAIA_STROKES,
  me: ALFAIA_STROKES,
  rp: ALFAIA_STROKES,
  cx: CAIXA_STROKES,
  tr: CAIXA_STROKES,
  gg: {
    strong: ['G', 'A', 'X', 'B'],
    weak: ['g', 'a'],
    special: ['G/A', 'g/a'],
  },
  ab: {
    strong: ['E', 'D', 'S', 'V', 'B'],
    weak: ['e', 'd'],
    special: ['E/d', 'D/e'],
  },
  mi: {
    strong: ['P', 'T', 'L', 'B'],
    weak: ['p', 't'],
    special: ['P/t', 'T/p'],
  },
  tb: {
    strong: ['G', 'A', 'S', 'T', 'D', 'P', 'F', 'V', 'C', 'B'],
    weak: ['g', 'a', 's', 't', 'd', 'p', 'f', 'v'],
    special: ['A/a', 'S/s', 'T/t'],
  },
  ap: {
    strong: ['L', 'C'],
    weak: ['l'],
    special: ['L/C'],
  },
};

const DEFAULT_CONFIG: RoleStrokesConfig = {
  strong: ['D', 'E', 'A', 'I', 'R', 'F', 'C', 'X', 'B'],
  weak: ['d', 'e', 'a', 'r', 'f'],
  special: ['D/E', 'd/I'],
};

export function getStrokesForRole(roleKey: string): RoleStrokesConfig {
  const norm = (roleKey || '').toLowerCase().replace(/[0-9]+$/, '');
  return ROLE_STROKES_MAP[norm] || DEFAULT_CONFIG;
}

export const ALL_STROKE_LETTERS: string[] = [
  'D', 'd', 'E', 'e', 'A', 'a', 'I', 'C', 'X', 'B',
  'R', 'r', 'F', 'f', 'G', 'g', 'S', 's', 'V', 'v',
  'P', 'p', 'T', 't', 'L', 'l', 'W', 'w',
];
