const patinaCache = new Map<string, string>();
const patinatedOutputs = new Set<string>();

/**
 * Filtre d'encre patinée Cordel (gouache / encre d'imprimerie sur peau d'Alfaia #e2d8c3).
 * Désature légèrement les teintes trop fluo, fusionne à ~22 % avec la peau chaude (#e2d8c3)
 * et assombrit d'une pointe d'encre (#1a1a1a à 6 %). Idempotent et mis en cache O(1).
 */
export function applyCordelInkedPatina(hexColor: string): string {
  if (!hexColor || typeof hexColor !== 'string') return '#8b2a1a';
  const norm = hexColor.trim().toLowerCase();
  if (!norm.startsWith('#')) return hexColor;
  if (patinatedOutputs.has(norm)) return norm;

  const cached = patinaCache.get(norm);
  if (cached) return cached;

  let hex = norm.slice(1);
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length < 6) return hexColor;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hexColor;

  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const rDesat = r * 0.86 + lum * 0.14;
  const gDesat = g * 0.86 + lum * 0.14;
  const bDesat = b * 0.86 + lum * 0.14;

  const rOut = Math.max(0, Math.min(255, Math.round(rDesat * 0.72 + 226 * 0.22 + 26 * 0.06)));
  const gOut = Math.max(0, Math.min(255, Math.round(gDesat * 0.72 + 216 * 0.22 + 26 * 0.06)));
  const bOut = Math.max(0, Math.min(255, Math.round(bDesat * 0.72 + 195 * 0.22 + 26 * 0.06)));

  const outHex = `#${rOut.toString(16).padStart(2, '0')}${gOut.toString(16).padStart(2, '0')}${bOut.toString(16).padStart(2, '0')}`;
  patinaCache.set(norm, outHex);
  patinatedOutputs.add(outHex);
  return outHex;
}
