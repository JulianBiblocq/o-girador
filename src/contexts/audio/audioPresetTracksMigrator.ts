import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { migrateCirclesToTracks } from '../../migration';
import { CURRENT_AUDIO_SCALE_VERSION, normalizeToFaderPosition, sanitizeFaderPosition } from '../../utils/audioMath';
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
        const isVoice = t.patterns?.some(p => (p.lyrics && p.lyrics.length > 0) || (p.activeSteps && p.activeSteps.some((s: any) => s === 'P' || s === 'C')));
        if (isVoice) {
          t.instrumentIdx = 10;
        } else if (t.instrumentIdx === 8) {
          const isApito = t.patterns.some(ptn => ptn.activeSteps && ptn.activeSteps.some(s => s === 'W' || s === 'w'));
          if (isApito) t.instrumentIdx = 9;
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
        const isVoice = (c.lyrics && c.lyrics.length > 0) || (c.activeSteps && c.activeSteps.some((s: any) => s === 'P' || s === 'C'));
        if (isVoice) {
          c.instrumentIdx = 10;
        } else if (c.instrumentIdx === 8) {
          const isApito = c.activeSteps && c.activeSteps.some((s: any) => s === 'W' || s === 'w');
          if (isApito) c.instrumentIdx = 9;
        }
      });
    }
    oldCircles.forEach((c: any) => {
      if (c.instrumentIdx >= instrumentsConfig.length) c.instrumentIdx = instrumentsConfig.length - 1;
    });
    loadedTracks = migrateCirclesToTracks(oldCircles, loadedMeasures);
    loadedTracks.forEach(t => t.patterns?.forEach(ptn => normalizePatternData(ptn, loadedMeasures)));
  }

  // Migration rétrocompatible des anciens presets
  const isAudioV2 = p.audioScaleVersion === CURRENT_AUDIO_SCALE_VERSION;
  loadedTracks.forEach(t => {
    const rawVol = (t as any).volumeVal !== undefined ? (t as any).volumeVal : (t as any).volume;
    t.volumeVal = normalizeToFaderPosition(rawVol, isAudioV2);
    if (!isAudioV2 && t.volumeVal === 100) t.volumeVal = 75;
    if (t.measureVols && Array.isArray(t.measureVols)) {
      t.measureVols = t.measureVols.map((v: number) => {
        const norm = normalizeToFaderPosition(v, isAudioV2);
        return (!isAudioV2 && norm === 100) ? 75 : norm;
      });
    }
  });

  // Auto-guérison : si toutes les pistes sont muettes (<= 3) suite au bug des 83px, rétablir à 75
  const nonBusTracks = loadedTracks.filter(t => !t.isBusFolder);
  const areAllMutedToInf = nonBusTracks.length > 0 && nonBusTracks.every(t => t.volumeVal <= 3);
  if (areAllMutedToInf) {
    loadedTracks.forEach(t => {
      t.volumeVal = 75;
      if (t.measureVols && Array.isArray(t.measureVols)) {
        t.measureVols = t.measureVols.map(() => 75);
      }
    });
  }

  // Assainissement systématique des paramètres de mixage des pistes
  loadedTracks.forEach(t => {
    t.volumeVal = sanitizeFaderPosition(t.volumeVal);
    const rawPan = typeof t.panVal === 'number' && !isNaN(t.panVal)
      ? t.panVal
      : (typeof t.pan === 'number' ? (Math.abs(t.pan) <= 1 && t.pan !== 0 ? Math.round(t.pan * 100) : t.pan) : 0);
    t.panVal = rawPan;
    t.pan = rawPan;
    t.isMute = Boolean(t.isMute);
    t.isSolo = Boolean(t.isSolo);
    const isLinkedSlave = Boolean(t.linkedToTrackId && !t.isLinkFolder && !t.isLinkMaster);
    t.isHidden = isLinkedSlave;
    if (!t.fxSends) {
      t.fxSends = { reverb: t.reverbVal ?? 0, distortion: 0 };
    }
  });

  return loadedTracks;
}
