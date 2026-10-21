/**
 * O Girador - Audio Engine Voice Guard Architecture
 */

import { ActiveVoice, GainNodeMapping } from './engineTypes';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { EngineVoiceStealing } from './engineVoiceStealing';

export class EngineVoiceGuard {
  public instrumentVoices = new Map<string, ActiveVoice[]>();
  public gainNodeMappingPool: GainNodeMapping[] = [];
  public gainNodeMappingPoolIndex = 0;
  public activeVoicePool: ActiveVoice[] = [];
  public activeVoicePoolIndex = 0;

  constructor() {
    for (let i = 0; i < 512; i++) {
      this.gainNodeMappingPool.push({ instrumentId: '', gainNode: null, expectedEnd: 0 });
      this.activeVoicePool.push({
        source: null as any, gainNode: null as any, time: 0, velocity: 0, instrumentId: ''
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

  public getActiveVoice(source: AudioBufferSourceNode, gainNode: GainNode, time: number, velocity: number, instrumentId: string): ActiveVoice {
    const obj = this.activeVoicePool[this.activeVoicePoolIndex];
    this.activeVoicePoolIndex = (this.activeVoicePoolIndex + 1) % 512;
    obj.source = source;
    obj.gainNode = gainNode;
    obj.time = time;
    obj.velocity = velocity;
    obj.instrumentId = instrumentId;
    return obj;
  }

  public removeActiveVoice(instrumentId: string, source: AudioBufferSourceNode): void {
    const voices = this.instrumentVoices.get(instrumentId);
    if (!voices) return;
    for (let i = 0; i < voices.length; i++) {
      if (voices[i].source === source) {
        const v = voices[i];
        v.source = null as any;
        v.gainNode = null as any;
        v.instrumentId = '';
        voices.splice(i, 1);
        break;
      }
    }
  }

  public getPolyphonyLimit(instrumentId: string): number {
    const isEco = useSequencerStore.getState().isEcoMode;
    if (isEco) {
      return ['caixa', 'tarol', 'timbal', 'agbe', 'mineiro', 'apito'].includes(instrumentId) ? 4 : 4;
    }
    if (['agbe', 'mineiro'].includes(instrumentId)) return 4;
    if (['caixa', 'tarol', 'timbal', 'apito'].includes(instrumentId)) return 6;
    return 6;
  }

  public enforceAlfaiaVoiceLimit(time: number): void {
    EngineVoiceStealing.stealOldestAlfaia(this.instrumentVoices, time);
  }

  public enforceStandardVoiceLimit(instrumentId: string, time: number): void {
    const limit = this.getPolyphonyLimit(instrumentId);
    EngineVoiceStealing.stealOldestStandard(this.instrumentVoices, instrumentId, limit, time);
  }
}
