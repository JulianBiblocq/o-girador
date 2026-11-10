/**
 * O Girador - Routage Post-Fader & Post-Bus des Départs d'Effets (0 Fuite Pre-Bus) (< 140 lignes)
 * Couvre 1 et 2 niveaux hiérarchiques : Piste -> LinkFolder/LinkMaster -> Bus Section.
 */
import * as Tone from 'tone';
import { instrumentsConfig } from '../../data';
import { getEffectiveMuteState, isToadaBus, isToadaChild, useSequencerStore } from '../../stores/useSequencerStore';
import { faderPositionToGain } from '../../utils/audioMath';
import { safeRampDb, safeRampTo } from '../../utils/audio/safeAudioParamRamp';
import { percentToDb } from '../../hooks/audio-sync/audioParamsCache';
import {
  reverbSends, distortionSends, reverbBusReceive, distortionBusReceive, busReverbSendVca, busDistoSendVca,
} from './effectsChainNodes';

export function resolveImmediateBusId(track: any, tracks: any[]): string | number | null {
  if (!track || !Array.isArray(tracks)) return null;
  const rawCandidate = track.busId || track.linkedToTrackId;
  if (rawCandidate !== undefined && rawCandidate !== null && String(rawCandidate) !== String(track.id)) {
    const parent = tracks.find((p) => String(p.id) === String(rawCandidate));
    if (parent) return parent.id;
  }
  if (!track.isBusFolder && !track.isLinkFolder) {
    const inst = instrumentsConfig[track.instrumentIdx];
    const isVocal = isToadaChild(track, tracks) || inst?.type === 'voice' || inst?.id === 'puxador' || inst?.id === 'coro';
    if (isVocal) {
      const toadaBus = tracks.find((b) => isToadaBus(b) && String(b.id) !== String(track.id));
      if (toadaBus) return toadaBus.id;
    }
  }
  return null;
}

export function computeBusLinearVcaGain(busTrack: any, tracks: any[], overrideVolumePos?: number): number {
  if (!busTrack) return 1.0;
  if (getEffectiveMuteState(tracks, busTrack.id)) return 0.0;
  return faderPositionToGain(overrideVolumePos !== undefined ? overrideVolumePos : (busTrack.volumeVal ?? 75));
}

export function computePostBusCascadeLinearGain(
  tracks: any[], trackId: string | number, volumeOverrides?: Record<string | number, number>
): number {
  const start = tracks.find((t) => String(t.id) === String(trackId));
  if (!start) return 0.0;
  let gain = 1.0;
  let current: any = start;
  const visited = new Set<string>([String(start.id)]);
  while (current) {
    const parentId = resolveImmediateBusId(current, tracks);
    if (parentId === null || visited.has(String(parentId))) break;
    visited.add(String(parentId));
    const parent = tracks.find((t) => String(t.id) === String(parentId));
    if (!parent) break;
    const overridePos = volumeOverrides?.[parent.id] ?? volumeOverrides?.[String(parent.id)];
    gain *= computeBusLinearVcaGain(parent, tracks, overridePos);
    if (gain <= 0) return 0.0;
    current = parent;
  }
  return gain;
}

export function computeEffectiveAuxSendLinearGain(
  tracks: any[],
  trackId: string | number,
  sendType: 'reverb' | 'distortion',
  disableFx = false,
  volumeOverrides?: Record<string | number, number>
): number {
  if (disableFx) return 0.0;
  const track = tracks.find((t) => String(t.id) === String(trackId));
  if (!track || getEffectiveMuteState(tracks, track.id)) return 0.0;
  const rawPct = sendType === 'reverb'
    ? (track.fxSends?.reverb ?? track.reverbVal ?? 0)
    : (track.fxSends?.distortion ?? 0);
  if (rawPct <= 0) return 0.0;
  const trackPos = volumeOverrides?.[track.id] ?? volumeOverrides?.[String(track.id)] ?? (track.volumeVal ?? 75);
  const trackLin = faderPositionToGain(trackPos);
  if (trackLin <= 0) return 0.0;
  const sendDb = percentToDb(rawPct);
  const sendLin = sendDb <= -99 || !Number.isFinite(sendDb) ? 0.0 : Math.pow(10, sendDb / 20);
  return trackLin * sendLin * computePostBusCascadeLinearGain(tracks, track.id, volumeOverrides);
}

export function ensureAuxSendNodes(trackId: string | number, revDb: number, distDb: number): void {
  const safeRev = Number.isFinite(revDb) ? Math.max(-100, Math.min(12, revDb)) : -100;
  const safeDist = Number.isFinite(distDb) ? Math.max(-100, Math.min(12, distDb)) : -100;
  if (!reverbSends[trackId]) reverbSends[trackId] = new Tone.Gain(safeRev, 'decibels');
  if (!distortionSends[trackId]) distortionSends[trackId] = new Tone.Gain(safeDist, 'decibels');
}

export function ensureBusSendVcaNodes(busId: string | number, initialLinearGain = 1.0): void {
  const safeLin = Number.isFinite(initialLinearGain) ? Math.max(0, Math.min(4, initialLinearGain)) : 0;
  if (!busReverbSendVca[busId]) busReverbSendVca[busId] = new Tone.Gain(safeLin);
  if (!busDistoSendVca[busId]) busDistoSendVca[busId] = new Tone.Gain(safeLin);
}

export function wireBusSendVcaOutput(busId: string | number, parentBusId: string | number | null): void {
  if (parentBusId !== null) ensureBusSendVcaNodes(parentBusId, 1.0);
  const revVca = busReverbSendVca[busId];
  const distVca = busDistoSendVca[busId];
  const revTarget = (parentBusId !== null && busReverbSendVca[parentBusId]) || reverbBusReceive;
  const distTarget = (parentBusId !== null && busDistoSendVca[parentBusId]) || distortionBusReceive;
  if (revVca) { try { revVca.disconnect(); if (revTarget) revVca.connect(revTarget); } catch (_) {} }
  if (distVca) { try { distVca.disconnect(); if (distTarget) distVca.connect(distTarget); } catch (_) {} }
}

export function wireAuxSendsToParentOrReceive(trackId: string | number, parentBusId: string | number | null): void {
  if (parentBusId !== null) ensureBusSendVcaNodes(parentBusId, 1.0);
  const revSend = reverbSends[trackId];
  const distSend = distortionSends[trackId];
  const revTarget = (parentBusId !== null && busReverbSendVca[parentBusId]) || reverbBusReceive;
  const distTarget = (parentBusId !== null && busDistoSendVca[parentBusId]) || distortionBusReceive;
  if (revSend) { try { revSend.disconnect(); if (revTarget) revSend.connect(revTarget); } catch (_) {} }
  if (distSend) { try { distSend.disconnect(); if (distTarget) distSend.connect(distTarget); } catch (_) {} }
}

export function syncBusSendVcaGain(busId: string | number, linearGain: number, rampSec = 0.02): void {
  const target = Number.isFinite(linearGain) && linearGain > 0.00001 ? Math.min(4, linearGain) : 0;
  if (busReverbSendVca[busId]?.gain) safeRampTo(busReverbSendVca[busId].gain, target, rampSec, 0, 4);
  if (busDistoSendVca[busId]?.gain) safeRampTo(busDistoSendVca[busId].gain, target, rampSec, 0, 4);
}

export function rampBusSendVcaFromFaderDrag(trackId: string | number, faderPos: number, rampSec = 0.02): void {
  if (!busReverbSendVca[trackId] && !busDistoSendVca[trackId]) return;
  const tracks = useSequencerStore.getState().tracks;
  const isMuted = getEffectiveMuteState(tracks, trackId);
  syncBusSendVcaGain(trackId, isMuted ? 0 : faderPositionToGain(faderPos), rampSec);
}

export function previewTrackAuxSendDrag(sendNode: any, val: number, disableFxOverride?: boolean): void {
  const disableFx = disableFxOverride ?? Boolean(useSequencerStore.getState().ecoConfig?.disableFx);
  const rawDb = disableFx || val <= 0 ? -100 : percentToDb(val);
  const targetDb = Number.isFinite(rawDb) ? Math.max(-100, Math.min(12, rawDb)) : -100;
  if (!sendNode?.gain) return;
  if (sendNode.gain.units === 'decibels') safeRampDb(sendNode.gain, targetDb, 0.02);
  else safeRampTo(sendNode.gain, targetDb <= -99 ? 0 : Math.pow(10, targetDb / 20), 0.02, 0, 4);
}
