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

    const fallbackVol = t.volumeVal ?? 75;
    if (!Array.isArray(t.measureVols) || t.measureVols.length !== loadedMeasures) {
      const cur = Array.isArray(t.measureVols) ? t.measureVols : [];
      t.measureVols = Array.from({ length: loadedMeasures }, (_, i) => cur[i] ?? fallbackVol);
    }
    if (!Array.isArray(t.measurePans) || t.measurePans.length !== loadedMeasures) {
      const cur = Array.isArray(t.measurePans) ? t.measurePans : [];
      t.measurePans = Array.from({ length: loadedMeasures }, (_, i) => cur[i] ?? (t.panVal ?? 0));
    }
    if (!Array.isArray(t.measureReverbSends) || t.measureReverbSends.length !== loadedMeasures) {
      const cur = Array.isArray(t.measureReverbSends) ? t.measureReverbSends : [];
      t.measureReverbSends = Array.from({ length: loadedMeasures }, (_, i) => cur[i] ?? (t.reverbVal ?? 0));
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
    if (t.busId !== undefined && t.busId !== null) t.busId = String(t.busId);
    if (t.linkedToTrackId !== undefined && t.linkedToTrackId !== null) t.linkedToTrackId = String(t.linkedToTrackId);
    const isLinkedChild = Boolean(t.linkedToTrackId && !t.isLinkFolder);
    if (t.isLinkMaster || isLinkedChild) {
      t.isBusFolder = false; t.isLinkFolder = false; t.isHidden = false;
      if (!t.patterns?.length) {
        const parent = loadedTracks.find(p => (String(p.id) === String(t.linkedToTrackId) || String(p.id) === String(t.busId)));
        if (parent?.patterns?.length) t.patterns = JSON.parse(JSON.stringify(parent.patterns));
      }
    } else {
      t.isHidden = Boolean(t.isHidden);
    }
    if (!t.fxSends) t.fxSends = { reverb: t.reverbVal ?? 0, distortion: 0 };
  });

  loadedTracks.filter(m => m.isLinkMaster).forEach(m => {
    const slaves = loadedTracks.filter(s => s.id !== m.id && !s.isLinkFolder && !s.isLinkMaster && s.linkedToTrackId &&
      (String(s.linkedToTrackId) === String(m.linkedToTrackId) || String(s.linkedToTrackId) === String(m.id)));
    slaves.forEach(s => {
      if (m.balancoPresetId !== undefined) s.balancoPresetId = m.balancoPresetId;
      if (m.balancoAmount !== undefined) s.balancoAmount = m.balancoAmount;
      if (m.swingIntensity !== undefined) s.swingIntensity = m.swingIntensity;
      m.patterns?.forEach(mP => {
        const sP = s.patterns?.find(p => p.name === mP.name);
        if (sP) {
          sP.balancoPresetId = mP.balancoPresetId;
          sP.balancoAmount = mP.balancoAmount;
          sP.swingIntensity = mP.swingIntensity;
        }
      });
    });
  });

  return loadedTracks;
}
