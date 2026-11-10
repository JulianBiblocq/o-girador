/**
 * Palier 2 Eco ("Alleger aussi les effets audio") : bypass doux et restauration exacte
 * des effets, sans aucun recablage du graphe audio (rampes 20-25 ms uniquement).
 */
import * as Tone from 'tone';
import { percentToDb } from './audioParamsCache';
import { safeRampDb, safeRampTo } from '../../utils/audio/safeAudioParamRamp';
import { reverbSends, distortionSends, masterDistortionVolumeNode, distortionNode } from './audioEngineNodes';
import { syncTrackInsertChain, syncBusInsertChain } from '../../audio/effectsChain';
import { applyVocalHaasEco } from '../../audio/vocal/vocalHaasModule';
import { resolveSaturationOversample } from '../../audio/effects/studioSaturationChain';
import { syncToadaVocalSlapback } from '../../audio/effects/toadaVocalSlapback';

function rampSendGain(send: any, percent: number): void {
  const gainParam = send?.gain;
  if (!gainParam) return;
  const db = Math.max(-100, Math.min(12, percentToDb(percent)));
  if (gainParam.units === 'decibels') {
    safeRampDb(gainParam, db, 0.025);
  } else {
    const lin = db <= -99 ? 0 : Tone.dbToGain(db);
    safeRampTo(gainParam, Number.isFinite(lin) ? lin : 0, 0.025, 0, 4);
  }
}

/** Departs Reverbe + Distorsion des pistes ET des bus (meme table indexee par id). */
export function applyFxSendsEco(disableFx: boolean, tracks: any[]): void {
  tracks.forEach((t) => {
    try {
      if (reverbSends[t.id]) rampSendGain(reverbSends[t.id], disableFx ? 0 : (t.fxSends?.reverb ?? t.reverbVal ?? 0));
      if (distortionSends[t.id]) rampSendGain(distortionSends[t.id], disableFx ? 0 : (t.fxSends?.distortion ?? 0));
    } catch (err) {
      console.error(`[EcoAudio] FX send ramp failed on track ${t.id}:`, err);
    }
  });
}

/** Retour Distorsion Master : coupe en Palier 2, restaure la valeur du store sinon. */
export function applyMasterDistortionEco(disableFx: boolean, state: any): void {
  if (distortionNode) {
    try { distortionNode.oversample = resolveSaturationOversample(Boolean(state.isEcoMode) || disableFx); } catch (_) {}
  }
  const busCfg = state.masterFX?.masterBus;
  syncToadaVocalSlapback(busCfg?.toadaSlapbackMode ?? 'off', busCfg?.toadaSlapbackWet ?? 0, disableFx);
  if (!masterDistortionVolumeNode) return;
  const fxActive = state.masterEffectsActive || { compressor: true, reverb: true, disto: true };
  const dist = state.masterFX?.distortion;
  const bypassed = disableFx || !fxActive.disto || Boolean(dist?.isMuted);
  const raw = bypassed ? 0 : Tone.dbToGain(percentToDb(dist?.returnVolume ?? 0));
  safeRampTo(masterDistortionVolumeNode.gain, Number.isFinite(raw) ? Math.max(0, Math.min(4, raw)) : 0, 0.025, 0, 4);
}

/**
 * Elargisseur Haas du Coro, pilote uniquement par `disableFx`.
 * Le compresseur Master est gere exclusivement par useMasterEffectsSync (zero double appel).
 */
export function applyHaasEco(disableFx: boolean): void {
  applyVocalHaasEco(disableFx);
}

/** EQ + Low-Cut des pistes et des bus (neutralises ou restaures selon `ecoConfig.disableEq`). */
export function applyEqEco(tracks: any[]): void {
  tracks.forEach((t) => {
    try {
      if (t.isBusFolder) syncBusInsertChain(t.id, t);
      else syncTrackInsertChain(t.id, t);
    } catch (err) {
      console.error(`[EcoAudio] EQ sync failed on track ${t.id}:`, err);
    }
  });
}

