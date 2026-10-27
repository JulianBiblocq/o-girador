/**
 * O Girador - Text Contrast Helpers for Step Badges & UI Elements
 */

export function isLightColor(colorHex?: string, threshold = 155): boolean {
  if (!colorHex || colorHex === 'transparent') return false;
  let hex = colorHex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
      return luminance > threshold;
    }
  }
  return false;
}

export function getContrastTextColor(colorHex?: string, threshold = 155): '#1a1a1a' | '#ffffff' {
  return isLightColor(colorHex, threshold) ? '#1a1a1a' : '#ffffff';
}

export function isDarkText(instId?: string, strokeVal?: string, bgColor?: string): boolean {
  if (bgColor && isLightColor(bgColor)) return true;
  if (!strokeVal) return false;

  if (instId === 'apito' && ['w', 'W'].includes(strokeVal)) return true;
  if (instId === 'gongue' && (strokeVal === 'A' || strokeVal === 'a')) return true;
  if (instId === 'agbe' && ['s', 'S', 'd', 'D', 'e', 'E', 'v', 'V'].includes(strokeVal)) return true;
  if (instId === 'caixa' && ['r', 'R', 'd', 'e', 'c', 'C'].includes(strokeVal)) return true;
  if (instId === 'timbal' && ['s', 'S', 'd', 'D', 'c', 'C', 'i', 'I'].includes(strokeVal)) return true;
  if (instId === 'mineiro' && ['t', 'p', 'L'].includes(strokeVal)) return true;
  if (instId === 'tarol' && ['c', 'C', 'd', 'e', 'F', 'f'].includes(strokeVal)) return true;
  if (instId && ['marcante', 'meiao', 'repique', 'alfaia', 'alfaia_1', 'alfaia_2', 'alfaia_3'].includes(instId)) {
    if (['c', 'C', 'd', 'e', 'i', 'I', 'x', 'X'].includes(strokeVal)) return true;
  }
  return false;
}
