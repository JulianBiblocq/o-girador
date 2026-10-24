/**
 * Spécification complète des frappes disponibles par pupitre pour le popover (< 90 lignes).
 */

export interface RoleStrokesConfig {
  strong: string[];
  weak: string[];
  special: string[];
}

const ROLE_STROKES_MAP: Record<string, RoleStrokesConfig> = {
  al: {
    strong: ['D', 'E', 'I', 'C', 'B', 'X', 'F'],
    weak: ['d', 'e', 'i'],
    special: ['D/E', 'd/I', 'e/D'],
  },
  mc: {
    strong: ['D', 'E', 'I', 'C', 'B', 'X', 'F'],
    weak: ['d', 'e', 'i'],
    special: ['D/E', 'd/I', 'e/D'],
  },
  me: {
    strong: ['D', 'E', 'I', 'C', 'B', 'X', 'F'],
    weak: ['d', 'e', 'i'],
    special: ['D/E', 'd/I', 'e/D'],
  },
  rp: {
    strong: ['D', 'E', 'I', 'C', 'B', 'X', 'F'],
    weak: ['d', 'e', 'i'],
    special: ['D/E', 'd/I', 'e/D'],
  },
  cx: {
    strong: ['D', 'E', 'R', 'F', 'X', 'C', 'B'],
    weak: ['d', 'e', 'r'],
    special: ['D/E', 'E/D'],
  },
  tr: {
    strong: ['D', 'E', 'R', 'F', 'X', 'C', 'B'],
    weak: ['d', 'e', 'r'],
    special: ['D/E', 'E/D'],
  },
  gg: {
    strong: ['G', 'A', 'X', 'B', 'C'],
    weak: ['g', 'a'],
    special: [],
  },
  ab: {
    strong: ['D', 'E', 'S', 'V', 'B', 'X', 'C'],
    weak: ['d', 'e', 's', 'v'],
    special: [],
  },
  mi: {
    strong: ['P', 'T', 'L', 'B', 'X', 'C'],
    weak: ['p', 't'],
    special: [],
  },
  tb: {
    strong: ['G', 'A', 'S', 'D', 'P', 'F', 'V', 'C', 'B', 'X'],
    weak: ['g', 'a', 's', 'd', 'p'],
    special: [],
  },
  ap: {
    strong: ['W', 'A', 'S', 'X'],
    weak: ['w'],
    special: [],
  },
};

const DEFAULT_CONFIG: RoleStrokesConfig = {
  strong: ['D', 'E', 'C', 'B', 'X', 'I', 'R', 'F'],
  weak: ['d', 'e', 'i', 'r'],
  special: ['D/E', 'd/I'],
};

export function getStrokesForRole(roleKey: string): RoleStrokesConfig {
  const norm = (roleKey || '').toLowerCase();
  return ROLE_STROKES_MAP[norm] || DEFAULT_CONFIG;
}

export const ALL_STROKE_LETTERS: string[] = [
  'D', 'd', 'E', 'e', 'C', 'B', 'X', 'I', 'i', 'F', 'R', 'r',
  'G', 'g', 'A', 'a', 'S', 's', 'V', 'v', 'P', 'p', 'T', 't', 'L', 'W', 'w',
];
