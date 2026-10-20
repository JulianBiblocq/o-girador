import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { migrateCirclesToTracks } from '../../migration';
import { CURRENT_AUDIO_SCALE_VERSION } from '../../utils/audioMath';
import { normalizePatternData } from './audioPatternNormalizer';

export function migrateAndSanitizePresetTracks(p: any, loadedMeasures: number): TrackGroup[] {
  let loadedTracks: TrackGroup[] = [];
  const version = p.version || 1;

  if (p.tracks) {
    loadedTracks = JSON.parse(JSON.stringify(p.tracks));
    if (version < 2) {
      loadedTracks.forEach(t => { if (t.instrumentIdx >= 4) t.instrumentIdx += 1; });
    }
    if (version < 3) {
      loadedTracks.forEach(t => {
        if (t.instrumentIdx === 8) {
          const isApito = t.patterns.some(ptn => ptn.activeSteps && ptn.activeSteps.some(s => s === 'W' || s === 'w'));
          if (!isApito) t.instrumentIdx = 9;
        } else if (t.instrumentIdx > 8) {
          t.instrumentIdx = 9;
        }
      });
    }
    loadedTracks.forEach(t => {
      if (t.instrumentIdx >= instrumentsConfig.length) t.instrumentIdx = instrumentsConfig.length - 1;
      t.patterns?.forEach(ptn => normalizePatternData(ptn, loadedMeasures));
    });
  } else if (p.circles) {
    const oldCircles = JSON.parse(JSON.stringify(p.circles));
    if (version < 2) {
      oldCircles.forEach((c: any) => { if (c.instrumentIdx >= 4) c.instrumentIdx += 1; });
    }
    if (version < 3) {
      oldCircles.forEach((c: any) => {
        if (c.instrumentIdx === 8) {
          const isApito = c.activeSteps && c.activeSteps.some((s: any) => s === 'W' || s === 'w');
          if (!isApito) c.instrumentIdx = 9;
        } else if (c.instrumentIdx > 8) {
          c.instrumentIdx = 9;
        }
      });
    }
    oldCircles.forEach((c: any) => {
      if (c.instrumentIdx >= instrumentsConfig.length) c.instrumentIdx = instrumentsConfig.length - 1;
    });
    loadedTracks = migrateCirclesToTracks(oldCircles, loadedMeasures);
    loadedTracks.forEach(t => t.patterns?.forEach(ptn => normalizePatternData(ptn, loadedMeasures)));
  }

  // Migration rétrocompatible des anciens presets (audioScaleVersion !== 2)
  const isAudioV2 = p.audioScaleVersion === CURRENT_AUDIO_SCALE_VERSION;
  if (!isAudioV2) {
    loadedTracks.forEach(t => {
      if (t.volumeVal === 100 || t.volumeVal === undefined) t.volumeVal = 75;
      else t.volumeVal = Math.round(t.volumeVal * 0.75);
      if (t.measureVols && Array.isArray(t.measureVols)) {
        t.measureVols = t.measureVols.map((v: number) => (v === 100 ? 75 : Math.round(v * 0.75)));
      }
    });
  }

  // Assainissement systématique des paramètres de mixage des pistes
  loadedTracks.forEach(t => {
    t.volumeVal = typeof t.volumeVal === 'number' && !isNaN(t.volumeVal) ? t.volumeVal : 75;
    const rawPan = typeof t.panVal === 'number' && !isNaN(t.panVal)
      ? t.panVal
      : (typeof t.pan === 'number' ? (Math.abs(t.pan) <= 1 && t.pan !== 0 ? Math.round(t.pan * 100) : t.pan) : 0);
    t.panVal = rawPan;
    t.pan = rawPan;
    t.isMute = Boolean(t.isMute);
    t.isSolo = Boolean(t.isSolo);
    if (!t.fxSends) {
      t.fxSends = { reverb: t.reverbVal ?? 0, distortion: 0 };
    }
  });

  return loadedTracks;
}
