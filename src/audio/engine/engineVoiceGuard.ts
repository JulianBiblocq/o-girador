/**
 * O Girador - Audio Engine Voice Guard (Pool Zéro-Allocation & Physique de Peau Isolée par TrackId) (< 95 lignes)
 */

import { ActiveVoice, GainNodeMapping } from './engineTypes';
import { applyWebAudioTrackSkinPhysics, computeAnalyticalVoiceGainAtTime } from './alfaiaTrackVoicePhysics';

export { computeAnalyticalVoiceGainAtTime };

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
        expectedEnd: 0, velocity: 0, isFullBuffer: false, instrumentId: '', strokeSymbol: '', isDucked: false,
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
    instrumentId: string,
    strokeSymbol = ''
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
    obj.strokeSymbol = strokeSymbol;
    obj.isDucked = false;
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
        v.strokeSymbol = '';
        v.isDucked = false;
        voices.splice(idx, 1);
      }
    });
  }

  public chokeTrackVoice(
    trackId: number | string | null,
    strokeSymbol: string,
    time: number,
    instrumentId = ''
  ): void {
    if (trackId === null || trackId === undefined) return;
    const voices = this.trackVoices.get(String(trackId));
    const resolvedInstId = instrumentId || voices?.[0]?.instrumentId || '';
    applyWebAudioTrackSkinPhysics(voices, resolvedInstId, strokeSymbol, time);
  }
}
