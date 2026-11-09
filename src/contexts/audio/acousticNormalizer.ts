/**
 * acousticNormalizer.ts
 * Normalisateur Acoustique non-intrusif au chargement :
 * - Ne force JAMAIS d'égalisation (`eqBands`), de `distortion` ou de `reverb` non désirée sur les morceaux existants.
 * - Corrige uniquement le bug d'échelle `masterReverbVol < 0` (en dB) vers un retour discret (max 22 %).
 * - Assure la migration douce `audioScaleVersion` et recalibre le niveau nominal des pas de 100/80 vers 70 (< 85 lignes).
 */
import { CURRENT_AUDIO_SCALE_VERSION, normalizeToFaderPosition } from '../../utils/audioMath';

export const CURRENT_LUTHERIE_VERSION = 3;

export function convertLegacyReverbDbToPercent(val: number | undefined): number {
  if (typeof val !== 'number' || isNaN(val)) return 20;
  if (val >= 0) return Math.max(0, Math.min(100, Math.round(val)));
  if (val <= -40) return 0;
  // Plafonne la conversion d'anciens niveaux dB négatifs à un retour studio discret (max 22 %)
  const rawPct = ((val + 40) / 40) * 22;
  return Math.round(Math.max(0, Math.min(22, rawPct)));
}

function recalibrateVolumesArray(volumes: any[] | undefined): any[] | undefined {
  if (!Array.isArray(volumes) || volumes.length === 0) return volumes;
  const isAllFlat100 = volumes.every((v: any) =>
    Array.isArray(v) ? Number(v[0]) === 100 && Number(v[1]) === 100 : Number(v) === 100
  );
  if (isAllFlat100) {
    return volumes.map((v: any) => (Array.isArray(v) ? [70, 70] : 70));
  }
  return volumes.map((v: any) => {
    if (Array.isArray(v)) {
      return [Number(v[0]) === 80 ? 70 : v[0], Number(v[1]) === 80 ? 70 : v[1]];
    }
    return Number(v) === 80 ? 70 : v;
  });
}

function recalibrateFlatStepVelocities(pattern: any): void {
  if (!pattern || typeof pattern !== 'object') return;
  if (Array.isArray(pattern.volumes)) {
    pattern.volumes = recalibrateVolumesArray(pattern.volumes);
  }
  if (Array.isArray(pattern.preRollVolumes)) {
    pattern.preRollVolumes = recalibrateVolumesArray(pattern.preRollVolumes);
  }
  if (Array.isArray(pattern.variations)) {
    pattern.variations.forEach((v: any) => {
      if (v && Array.isArray(v.volumes)) {
        v.volumes = recalibrateVolumesArray(v.volumes);
      }
    });
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
