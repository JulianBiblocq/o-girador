/**
 * O Girador - Audio Engine Voice Guard (Pool Zéro-Allocation & Choke Futur Sans Clic Isolé par TrackId) (< 120 lignes)
 */

import { ActiveVoice, GainNodeMapping } from './engineTypes';

export function computeAnalyticalVoiceGainAtTime(v: ActiveVoice, t: number): number {
  const peak = Math.max(0.0001, v.velocity);
  if (t <= v.holdEnd) return peak;
  if (t >= v.expectedEnd) return 0.0001;

  if (v.isFullBuffer) {
    const dur = Math.max(0.0001, v.expectedEnd - v.holdEnd);
    return Math.max(0.0001, peak * (1 - (t - v.holdEnd) / dur));
  }

  const releaseSec = Math.max(0.0001, v.releaseEnd - v.holdEnd);
  const midRelease = v.holdEnd + releaseSec * 0.5;
  const midGain = Math.max(0.0001, peak * 0.35);

  if (t <= midRelease) {
    const ratio = (t - v.holdEnd) / Math.max(0.0001, midRelease - v.holdEnd);
    return Math.max(0.0001, peak + (midGain - peak) * ratio);
  }
  if (t <= v.releaseEnd) {
    const ratio = (t - midRelease) / Math.max(0.0001, v.releaseEnd - midRelease);
    return Math.max(0.0001, midGain * Math.pow(0.0001 / midGain, ratio));
  }
  const tailRatio = (t - v.releaseEnd) / Math.max(0.0001, v.expectedEnd - v.releaseEnd);
  return Math.max(0.0001, 0.0001 * (1 - tailRatio));
}

export class EngineVoiceGuard {
  public gainNodeMappingPool: GainNodeMapping[] = [];
  public gainNodeMappingPoolIndex = 0;
  public activeVoicePool: ActiveVoice[] = [];
  public activeVoicePoolIndex = 0;
  public trackVoices = new Map<string, ActiveVoice[]>();

  constructor() {
    for (let i = 0; i < 512; i++) {
      this.gainNodeMappingPool.push({ instrumentId: '', gainNode: null, expectedEnd: 0 });
      this.activeVoicePool.push({
        source: null as any, gainNode: null as any, time: 0, holdEnd: 0, releaseEnd: 0,
        expectedEnd: 0, velocity: 0, isFullBuffer: false, instrumentId: ''
      });
    }
  }

  public getGainNodeMapping(instrumentId: string, gainNode: GainNode, expectedEnd: number): GainNodeMapping {
    const obj = this.gainNodeMappingPool[this.gainNodeMappingPoolIndex];
    this.gainNodeMappingPoolIndex = (this.gainNodeMappingPoolIndex + 1) % 512;
    obj.instrumentId = instrumentId;
    obj.gainNode = gainNode;
    obj.expectedEnd = expectedEnd;
    return obj;
  }

  public getActiveVoice(
    source: AudioBufferSourceNode,
    gainNode: GainNode,
    time: number,
    holdEnd: number,
    releaseEnd: number,
    expectedEnd: number,
    velocity: number,
    isFullBuffer: boolean,
    instrumentId: string
  ): ActiveVoice {
    const obj = this.activeVoicePool[this.activeVoicePoolIndex];
    this.activeVoicePoolIndex = (this.activeVoicePoolIndex + 1) % 512;
    obj.source = source;
    obj.gainNode = gainNode;
    obj.time = time;
    obj.holdEnd = holdEnd;
    obj.releaseEnd = releaseEnd;
    obj.expectedEnd = expectedEnd;
    obj.velocity = velocity;
    obj.isFullBuffer = isFullBuffer;
    obj.instrumentId = instrumentId;
    return obj;
  }

  public removeActiveVoice(_instrumentId: string, source: AudioBufferSourceNode): void {
    this.trackVoices.forEach((voices) => {
      const idx = voices.findIndex((v) => v.source === source);
      if (idx !== -1) {
        const v = voices[idx];
        v.source = null as any;
        v.gainNode = null as any;
        v.instrumentId = '';
        voices.splice(idx, 1);
      }
    });
  }

  public chokeTrackVoice(trackId: number | string | null, strokeSymbol: string, time: number): void {
    if (trackId === null || trackId === undefined) return;
    if (strokeSymbol !== 'p' && strokeSymbol !== 'P') return;

    const voices = this.trackVoices.get(String(trackId));
    if (!voices || voices.length === 0) return;

    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      if (v && v.gainNode && v.time < time && time < v.expectedEnd) {
        try {
          const chokeTime = time;
          const gainParam = v.gainNode.gain as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
          if (typeof gainParam.cancelAndHoldAtTime === 'function') {
            gainParam.cancelAndHoldAtTime(chokeTime);
          } else {
            const gAtTime = computeAnalyticalVoiceGainAtTime(v, chokeTime);
            gainParam.cancelScheduledValues(chokeTime);
            gainParam.setValueAtTime(gAtTime, chokeTime);
          }
          gainParam.linearRampToValueAtTime(0.0001, chokeTime + 0.008);
          gainParam.setValueAtTime(0, chokeTime + 0.009);
          v.expectedEnd = chokeTime + 0.010;
          v.source?.stop(chokeTime + 0.010);
        } catch (_) {}
      }
    }
  }
}
