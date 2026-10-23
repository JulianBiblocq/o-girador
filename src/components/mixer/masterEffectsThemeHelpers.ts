/**
 * Helpers pour le contraste dynamique des étiquettes d'effets Master (< 50 lignes).
 */

export function updateMasterEffectLabelContrast(
  labelEl: HTMLElement | null,
  opacity: number,
  isLight: boolean,
  type: 'reverb' | 'disto'
): void {
  if (!labelEl) return;
  if (!isLight) {
    labelEl.style.color = '#f4ecd8';
    labelEl.style.textShadow = '0 1px 1px rgba(0, 0, 0, 0.6)';
    return;
  }
  // Mode Clair : foncé de 0 à 65%, crème au-delà
  if (opacity > 0.65) {
    labelEl.style.color = '#f4ecd8';
    labelEl.style.textShadow = '0 1px 1px rgba(0, 0, 0, 0.6)';
  } else {
    labelEl.style.color = type === 'reverb' ? '#122b42' : '#5c2206';
    labelEl.style.textShadow = 'none';
  }
}
