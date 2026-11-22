/**
 * sectionBarulhoPhaseHelper.ts — Anti-collision Round-Robin `(baseIdx + k) % M`
 * & décorrélation de phase stationnaire du Barulho `B` / `b` (`~350 ms` + étalement `15..40 ms`) (< 70 lignes).
 * Module 100 % pur (compatible AudioWorklet IIFE, Main Thread et OfflineAudioContext).
 */

export const BARULHO_PARTNER_PHASE_STEP_SEC = 0.350;
export const BARULHO_PARTNER_ATTACK_RAMP_SEC = 0.028;

export function selectSquadPlayerSampleIndex(baseIdx: number, playerIdx: number, sampleCount: number): number {
  if (sampleCount <= 1) return 0;
  const safeBase = ((baseIdx | 0) % sampleCount + sampleCount) % sampleCount;
  return (safeBase + Math.max(0, playerIdx | 0)) % sampleCount;
}

export function selectSquadPlayerFile(files: readonly string[], baseIdx: number, playerIdx: number): string {
  if (!files || files.length === 0) return '';
  return files[selectSquadPlayerSampleIndex(baseIdx, playerIdx, files.length)] || files[0] || '';
}

export function computeBarulhoPartnerEntrySpreadSec(playerIdx: number, totalPlayers: number): number {
  if (playerIdx <= 0 || totalPlayers <= 1) return 0;
  if (totalPlayers === 2) return 0.022;
  const denom = Math.max(1, totalPlayers - 2);
  const ratio = Math.max(0, Math.min(1, (playerIdx - 1) / denom));
  return 0.015 + ratio * 0.025; // [15 ms .. 40 ms]
}

export function computeBarulhoDecorrelatedReadFrame(
  playerIdx: number,
  loopResumeFrame: number,
  loopWrapFrame: number,
  sampleRate: number
): number {
  const safeSr = sampleRate > 0 ? sampleRate : 48000;
  const resume = Math.max(0, loopResumeFrame | 0);
  const wrap = Math.max(resume, loopWrapFrame | 0);
  const span = wrap - resume;
  if (playerIdx <= 0) return 0;
  if (span <= 16) return resume;

  // Décalage ~350 ms + léger terme premier (19 ms) pour interdire toute collision modulo span
  const stepFrames = Math.round(BARULHO_PARTNER_PHASE_STEP_SEC * safeSr);
  const primeNudge = Math.round(0.019 * safeSr);
  let offset = (playerIdx * stepFrames + playerIdx * playerIdx * primeNudge) % span;
  const minFloor = Math.min(Math.floor(span * 0.12), Math.round(0.055 * safeSr));
  if (offset < minFloor) {
    offset = Math.min(span - 1, Math.max(minFloor, Math.floor(((playerIdx * 0.23) % 0.85 + 0.12) * span)));
  }
  return resume + offset;
}
