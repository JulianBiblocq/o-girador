/**
 * acousticNormalizer.ts
 * Normalisateur Acoustique non-intrusif au chargement :
 * - Ne force JAMAIS d'égalisation (`eqBands`), de `distortion` ou de `reverb` non désirée sur les morceaux existants.
 * - Corrige uniquement le bug d'échelle `masterReverbVol < 0` (en dB) vers un retour discret (max 22 %).
 * - Assure la migration douce `audioScaleVersion` et recalibre les grilles figées à 100 vers 80 (< 65 lignes).
 */
import { CURRENT_AUDIO_SCALE_VERSION, normalizeToFaderPosition } from '../../utils/audioMath';

export const CURRENT_LUTHERIE_VERSION = 2;

export function convertLegacyReverbDbToPercent(val: number | undefined): number {
  if (typeof val !== 'number' || isNaN(val)) return 20;
  if (val >= 0) return Math.max(0, Math.min(100, Math.round(val)));
  if (val <= -40) return 0;
  // Plafonne la conversion d'anciens niveaux dB négatifs à un retour studio discret (max 22 %)
  const rawPct = ((val + 40) / 40) * 22;
  return Math.round(Math.max(0, Math.min(22, rawPct)));
}

function recalibrateFlatStepVelocities(pattern: any): void {
  if (!pattern || !Array.isArray(pattern.volumes) || pattern.volumes.length === 0) return;
  const isAllFlat100 = pattern.volumes.every((v: any) =>
    Array.isArray(v) ? Number(v[0]) === 100 && Number(v[1]) === 100 : Number(v) === 100
  );
  if (isAllFlat100) {
    pattern.volumes = pattern.volumes.map((v: any) => (Array.isArray(v) ? [80, 80] : 80));
  }
}

export function normalizePresetAcousticsOnLoad(rawPreset: any): any {
  if (!rawPreset || typeof rawPreset !== 'object') return rawPreset;
  const p = rawPreset;
  const isAudioV2 = p.audioScaleVersion === CURRENT_AUDIO_SCALE_VERSION;

  if (typeof p.masterReverbVol === 'number' && p.masterReverbVol < 0) {
    p.masterReverbVol = convertLegacyReverbDbToPercent(p.masterReverbVol);
  }
  if (p.masterFX?.reverb && typeof p.masterFX.reverb.returnVolume === 'number' && p.masterFX.reverb.returnVolume < 0) {
    p.masterFX.reverb.returnVolume = convertLegacyReverbDbToPercent(p.masterFX.reverb.returnVolume);
  }

  if (Array.isArray(p.tracks)) {
    p.tracks.forEach((t: any) => {
      if (!t) return;
      if (Array.isArray(t.patterns)) t.patterns.forEach(recalibrateFlatStepVelocities);
      if (t.isBusFolder) return;

      const rawVol = t.volumeVal !== undefined ? t.volumeVal : t.volume;
      if (rawVol !== undefined) {
        const normVol = normalizeToFaderPosition(rawVol, isAudioV2);
        t.volumeVal = !isAudioV2 && normVol === 100 ? 75 : normVol;
      }
    });
  }

  p.audioScaleVersion = CURRENT_AUDIO_SCALE_VERSION;
  p.lutherieVersion = CURRENT_LUTHERIE_VERSION;
  return p;
}
