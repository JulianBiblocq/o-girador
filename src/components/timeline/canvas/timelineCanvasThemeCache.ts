import { applyCordelInkedPatina } from '../../../utils/colorHelpers';

export interface TimelineCanvasTheme {
  isDark: boolean; cordelBg: string; cordelText: string; cordelBorder: string;
  inkBorder: string; inkShadow: string; accentCrimson: string; coroTeal: string;
  puxText: string; coroText: string; fontCactus: string; fontSans: string; fontMono: string;
  diagonalHatchPattern: CanvasPattern | null; woodGrainPattern: CanvasPattern | null;
}

let cachedTheme: TimelineCanvasTheme | null = null;

export function getPatinatedColor(hexColor: string): string {
  return applyCordelInkedPatina(hexColor);
}

export function withHexAlpha(color: string, alphaHex: string): string {
  if (!color) return `#1a1a1a${alphaHex}`;
  const trimmed = color.trim();
  if (!trimmed.startsWith('#')) return trimmed;
  let hex = trimmed.slice(1);
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return hex.length >= 6 ? `#${hex.slice(0, 6)}${alphaHex}` : trimmed;
}

function buildDiagonalHatchPattern(strokeColor: string): CanvasPattern | null {
  if (typeof document === 'undefined') return null;
  try {
    const off = document.createElement('canvas');
    off.width = 8; off.height = 8;
    const octx = off.getContext('2d');
    if (!octx || typeof octx.createPattern !== 'function') return null;
    octx.strokeStyle = strokeColor; octx.lineWidth = 1;
    octx.beginPath();
    octx.moveTo(0, 8); octx.lineTo(8, 0);
    octx.moveTo(-2, 2); octx.lineTo(2, -2);
    octx.moveTo(6, 10); octx.lineTo(10, 6);
    octx.stroke();
    return octx.createPattern(off, 'repeat');
  } catch { return null; }
}

function buildWoodGrainPattern(isDark: boolean): CanvasPattern | null {
  if (typeof document === 'undefined') return null;
  try {
    const off = document.createElement('canvas');
    off.width = 16; off.height = 6;
    const octx = off.getContext('2d');
    if (!octx || typeof octx.createPattern !== 'function') return null;
    octx.fillStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
    octx.fillRect(0, 1, 16, 1);
    octx.fillRect(3, 4, 11, 1);
    return octx.createPattern(off, 'repeat');
  } catch { return null; }
}

export function invalidateTimelineCanvasTheme(): void {
  cachedTheme = null;
}

export function getTimelineCanvasTheme(): TimelineCanvasTheme {
  if (cachedTheme) return cachedTheme;
  let isDark = false, cordelBg = '#f4ecd8', cordelText = '#1a1a1a', cordelBorder = '#1a1a1a';

  if (typeof document !== 'undefined' && document.documentElement) {
    const root = document.documentElement;
    isDark = root.classList.contains('dark') || root.getAttribute('data-theme') === 'dark';
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      const style = window.getComputedStyle(root);
      cordelBg = style.getPropertyValue('--cordel-bg').trim() || (isDark ? '#141414' : '#f4ecd8');
      cordelText = style.getPropertyValue('--cordel-text').trim() || (isDark ? '#f4ecd8' : '#1a1a1a');
      cordelBorder = style.getPropertyValue('--cordel-border').trim() || (isDark ? '#f4ecd8' : '#1a1a1a');
    }
  }

  cachedTheme = {
    isDark, cordelBg, cordelText, cordelBorder,
    inkBorder: isDark ? '#000000' : '#1a1a1a',
    inkShadow: isDark ? 'rgba(0,0,0,0.85)' : '#1a1a1a',
    accentCrimson: '#8b2a1a', coroTeal: '#00838f',
    puxText: isDark ? '#f39c12' : '#8b2a1a',
    coroText: isDark ? '#4dd0e1' : '#00838f',
    fontCactus: '"Cactus Classical Serif", Georgia, serif',
    fontSans: 'Inter, system-ui, sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    diagonalHatchPattern: buildDiagonalHatchPattern(cordelText),
    woodGrainPattern: buildWoodGrainPattern(isDark),
  };
  return cachedTheme;
}

export function observeThemeAndFontsForCanvas(onInvalidate: () => void): () => void {
  const trigger = () => { invalidateTimelineCanvasTheme(); onInvalidate(); };
  let observer: MutationObserver | null = null;
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.documentElement) {
    observer = new MutationObserver(trigger);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
  }
  if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
    (document as any).fonts.ready.then(trigger).catch(() => {});
  }
  return () => { if (observer) observer.disconnect(); };
}
