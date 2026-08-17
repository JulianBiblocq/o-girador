export type IntensityLevel = 'strong' | 'weak' | 'accent' | 'muted' | 'special';

export interface InstrumentTheme {
  mixerBg: string;
  color: string;
  strong?: string;
  weak?: string;
  accent?: string;
  muted?: string;
  special?: string;
  overrides?: Record<string, string>;
}

export type ThemePalette = Record<string, InstrumentTheme>;

/**
 * Universal map associating strokes to an intensity level.
 * Both left and right hands point to the same intensity to unify the coloring.
 */
export const STROKE_INTENSITY_MAP: Record<string, IntensityLevel> = {
  // Fort (Main Droite / Main Gauche)
  'D': 'strong', 'E': 'strong',
  // Faible (Main Droite / Main Gauche)
  'd': 'weak',   'e': 'weak',
  
  // Mineiro (Haut/Bas)
  'P': 'strong', 'T': 'strong',
  'p': 'weak',   't': 'weak',
  'L': 'special',
  
  // Accents & Spéciaux
  'X': 'special', // Cerclage
  'I': 'accent',  // Bacalhau
  'C': 'muted',   // Click
  'B': 'muted',   // Barulho
  'F': 'accent',  // Fla
  'R': 'accent',  // Rufada courte D
  'r': 'accent',  // Rufada courte G
  
  // Agbe
  'S': 'special', // Salto
  'V': 'accent',  // Volta
  
  // Gongue
  'G': 'strong', 'g': 'weak',
  'A': 'accent', 'a': 'weak',
  
  // Apito
  'W': 'strong', 'w': 'weak'
};

export const MARACATU_THEME: ThemePalette = {
  marcante: {
    mixerBg: '#3a1010', color: '#8a2b2b',
    strong: '#8a2b2b', weak: '#fca5a5', accent: '#ff8da1', muted: '#4c1c1c', special: '#8c7b7b',
    overrides: { 'C': '#fee2e2' } // Clic très clair
  },
  meiao: {
    mixerBg: '#3a2010', color: '#ab5318',
    strong: '#ab5318', weak: '#fdba74', accent: '#ffb74d', muted: '#4c2c16', special: '#9c8476',
    overrides: { 'C': '#ffedd5' } // Clic très clair
  },
  repique: {
    mixerBg: '#3a3010', color: '#c9a724',
    strong: '#c9a724', weak: '#fef08a', accent: '#fff59d', muted: '#4d441c', special: '#9c9984',
    overrides: { 'C': '#fef9c3' } // Clic très clair
  },
  caixa: {
    mixerBg: '#2a103a', color: '#7a3187',
    strong: '#581c87', // Sombre
    weak: '#c084fc',   // Très clair
    accent: '#d946ef', muted: '#4a044e', special: '#7e7b8c',
    overrides: { 'R': '#a855f7', 'r': '#a855f7', 'C': '#f3e8ff' }
  },
  tarol: {
    mixerBg: '#102a3a', color: '#2563eb',
    strong: '#1e3a8a', // Sombre
    weak: '#93c5fd',   // Très clair
    accent: '#bfdbfe', muted: '#0284c7', special: '#3a506b',
    overrides: { 'R': '#818cf8', 'r': '#818cf8', 'C': '#dbeafe' }
  },
  gongue: {
    mixerBg: '#1a1a1a', color: '#bdc3c7',
    strong: '#222222', weak: '#7f8c8d', accent: '#bdc3c7', muted: '#6d4c41', special: '#7f8c8d',
    overrides: { 'G': '#222222', 'g': '#444444', 'A': '#bdc3c7', 'a': '#7f8c8d' }
  },
  agbe: {
    mixerBg: '#103a20', color: '#22c55e',
    strong: '#15803d', weak: '#4ade80', accent: '#a7f3d0', muted: '#052e16', special: '#dcfce7',
    overrides: { 'S': '#dcfce7', 'V': '#a7f3d0' }
  },
  mineiro: {
    mixerBg: '#192e1b', color: '#588157',
    strong: '#283618', weak: '#a3b18a', accent: '#dad7cd', muted: '#1b4332', special: '#dad7cd',
    overrides: { 'L': '#dad7cd' } // On retire p, P, t, T pour qu'ils héritent de strong/weak
  },
  timbal: {
    mixerBg: '#302008', color: '#d97706',
    overrides: {
      'G': '#78350f', 'g': '#78350f', // Grave (Fort)
      'A': '#d97706', 'a': '#d97706', // Aigu (Fort)
      'S': '#fbbf24', 's': '#fbbf24', // Slap (Fort)
      'D': '#fef08a', 'd': '#fef08a', // Dedilhado (Faible/Clair)
      'P': '#451a03', 'p': '#451a03', // Preso (Muted)
      'F': '#ea580c', 'V': '#f97316',
      'C': '#ffedd5', 'B': '#291002'  // Clic clair
    }
  },
  apito: {
    mixerBg: '#3c3a10', color: '#e74c3c',
    strong: '#e74c3c', weak: '#f1c40f',
  },
  puxador: {
    mixerBg: '#5c3a1c', color: '#e9cca8',
    strong: '#e9cca8'
  },
  coro: {
    mixerBg: '#114a4a', color: '#b3dcd8',
    strong: '#b3dcd8'
  },
  toada: {
    mixerBg: '#392416', color: '#e9cca8',
    overrides: { 'P': '#e9cca8', 'C': '#b3dcd8' }
  }
};

/**
 * Generates an O(1) lookup dictionary for a given instrument's colors.
 * This runs once at initialization to prevent Render Thrashing.
 */
export function buildInstrumentColors(themePalette: ThemePalette, familyId: string): Record<string, string> {
  const colors: Record<string, string> = { text: '#f4ecd8' };
  const theme = themePalette[familyId];

  if (!theme) return colors;

  // Apply generic mapping
  for (const [stroke, intensity] of Object.entries(STROKE_INTENSITY_MAP)) {
    if (theme[intensity]) {
      colors[stroke] = theme[intensity]!;
    } else {
      colors[stroke] = theme.color;
    }
  }

  // Apply explicit overrides (has priority)
  if (theme.overrides) {
    for (const [stroke, colorHex] of Object.entries(theme.overrides)) {
      colors[stroke] = colorHex;
    }
  }

  return colors;
}
