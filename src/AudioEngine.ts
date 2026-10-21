/**
 * O Girador - High-Precision Web Audio Lookahead Engine & Sampler Orchestrator
 */

import { instrumentAudioConfigs, InstrumentAudioConfig } from './data/audioConfig';
import { useSequencerStore } from './stores/useSequencerStore';
import { TrackGroup } from './types';
import { VocalPresetId } from './audio/vocalPresets';
import { ActiveInstrumentData, GainNodeMapping } from './audio/engine/engineTypes';
import { EngineChannels } from './audio/engine/engineChannels';
import { EngineVoiceSynthManager } from './audio/engine/engineVoiceSynth';
import { EngineVocalActions } from './audio/engine/engineVocalActions';
import { EngineVoiceGuard } from './audio/engine/engineVoiceGuard';
import { EngineSampleLoader } from './audio/engine/engineSampleLoader';
import { EngineSampleActions } from './audio/engine/engineSampleActions';
import { EngineRoundRobin } from './audio/engine/engineRoundRobin';
import { EngineBarulhoPlayer } from './audio/engine/engineBarulhoPlayer';
import { EngineVirtualStrokes } from './audio/engine/engineVirtualStrokes';
import { EngineSchedulerClock } from './audio/engine/engineSchedulerClock';
import { EngineNotePlayer } from './audio/engine/engineNotePlayer';
import { EnginePurge } from './audio/engine/enginePurge';
import { EngineVisibility } from './audio/engine/engineVisibility';
import { EngineDisposer } from './audio/engine/engineDisposer';
import { scheduleAudioContextAutoSuspend, safeResumeAudioContext, safeSuspendAudioContext } from './audio/audioContextSuspendManager';

export type { ActiveInstrumentData };

export class AudioEngine {
  private clock: EngineSchedulerClock;
  private channels = new EngineChannels();
  private voiceSynthManager = new EngineVoiceSynthManager();
  private voiceGuard = new EngineVoiceGuard();
  private sampleLoader = new EngineSampleLoader();
  private roundRobin = new EngineRoundRobin();
  private barulho = new EngineBarulhoPlayer();
  private scheduledHits = new Set<AudioBufferSourceNode>();
  private activeGainNodes = new Map<AudioBufferSourceNode, GainNodeMapping>();
  private configMap = new Map<string, InstrumentAudioConfig>(instrumentAudioConfigs.map(c => [c.id, c]));
  private strokesMaps = EngineVirtualStrokes.buildStrokesMaps(instrumentAudioConfigs);
  private trackLookupMap = new Map<string, TrackGroup>();
  private timeSlotHitCounts = new Map<number, number>();
  private unsubscribeTracks: (() => void) | null = null;
  private cleanupVisibility: (() => void) | null = null;

  constructor(
    private audioContext: AudioContext,
    onTick: (time: number) => boolean | void,
    getTickDuration: () => number,
    getTicksPerMeasure: (measureIdx: number) => number = () => 96
  ) {
    this.updateTrackLookupMap(useSequencerStore.getState().tracks);
    this.unsubscribeTracks = useSequencerStore.subscribe((s) => this.updateTrackLookupMap(s.tracks));
    this.barulho.init(audioContext, this.channels, this.voiceGuard, this.activeGainNodes);
    this.voiceSynthManager.initVoiceSynth(undefined, this.channels.instrumentChannels);
    this.clock = new EngineSchedulerClock(audioContext, {
      onTick, getTickDuration, getTicksPerMeasure, purgeScheduledHits: () => this.purgeScheduledHits()
    });
    this.cleanupVisibility = EngineVisibility.setup(
      audioContext, this.clock, this.activeGainNodes, this.scheduledHits,
      this.channels, this.voiceGuard, this.barulho, () => this.purgeScheduledHits()
    );
  }

  private updateTrackLookupMap(tracks: TrackGroup[]): void {
    this.trackLookupMap.clear();
    for (let i = 0; i < tracks.length; i++) this.trackLookupMap.set(String(tracks[i].id), tracks[i]);
  }

  public get bufferPool() { return this.sampleLoader.bufferPool; }
  public get currentStep() { return this.clock.currentStep; } public set currentStep(v: number) { this.clock.currentStep = v; }
  public get currentMeasure() { return this.clock.currentMeasure; } public set currentMeasure(v: number) { this.clock.currentMeasure = v; }
  public get schedulingStep() { return this.clock.schedulingStep; } public set schedulingStep(v: number) { this.clock.schedulingStep = v; }
  public get schedulingMeasure() { return this.clock.schedulingMeasure; } public set schedulingMeasure(v: number) { this.clock.schedulingMeasure = v; }
  public get LOOKAHEAD_INTERVAL() { return this.clock.LOOKAHEAD_INTERVAL; } public get SCHEDULE_AHEAD_TIME() { return this.clock.SCHEDULE_AHEAD_TIME; }
  public get voiceSynths() { return this.voiceSynthManager.voiceSynths; } public get voiceSynth() { return this.voiceSynthManager.voiceSynth; }
  public get currentVocalPreset() { return this.voiceSynthManager.currentVocalPreset; } public set currentVocalPreset(v: VocalPresetId) { this.voiceSynthManager.currentVocalPreset = v; }

  public setOnPositionJump(cb: (step: number, measure: number) => void): void { (this.clock as any).onPositionJump = cb; }
  public start(startTime?: number): void { safeResumeAudioContext(); this.clock.start(startTime); }
  public stop(): void { this.clock.stop(); this.purgeScheduledHits(); this.releaseAllVoices(); scheduleAudioContextAutoSuspend(500); }
  public forceReanchor(): void { this.clock.forceReanchor(); }
  public getIsPlaying(): boolean { return this.clock.isPlaying; }
  public getCurrentTime(): number { return this.audioContext.currentTime; }
  public getAudioContext(): AudioContext { return this.audioContext; }

  private getNotePlayerDeps() {
    return EngineNotePlayer.buildDeps(
      this.audioContext, this.channels, this.voiceGuard, this.barulho,
      this.scheduledHits, this.activeGainNodes, this.sampleLoader, this.roundRobin,
      this.configMap, this.strokesMaps, this.trackLookupMap, this.timeSlotHitCounts,
      () => this.clock.schedulingMeasure
    );
  }

  public playNote(trackId: number | string, stroke: string, time: number, vel: number, decay: number, isLiveHold = false): void {
    EngineNotePlayer.playNote(this.getNotePlayerDeps(), trackId, stroke, time, vel, decay, isLiveHold);
  }
  public playPreview(instId: string, stroke: string, pitch = 0, vel = 1.0, time?: number): void {
    EngineNotePlayer.playPreview(this.getNotePlayerDeps(), instId, stroke, pitch, vel, time);
  }
  public triggerVoicePitch(pitch: string | number, vel = 0.8, trackId?: string | number): void {
    EngineVocalActions.triggerPitch(this.audioContext, this.voiceSynthManager, pitch, vel, trackId);
  }
  public triggerVoiceAttackRelease(pitch: string | number, dur: number | string, time?: number, vel = 0.8, trackId?: string | number): void {
    EngineVocalActions.triggerAttackRelease(this.audioContext, this.voiceSynthManager, pitch, dur, time, vel, trackId);
  }
  public releaseVoicePitch(pitch?: string | number, trackId?: string | number): void {
    EngineVocalActions.releasePitch(this.voiceSynthManager, pitch, trackId);
  }
  public releaseAllVoices(): void { this.voiceSynthManager.releaseAllVoices(); }
  public releaseVoicesForTrack(trackId: string | number): void { this.voiceSynthManager.releaseVoicesForTrack(trackId); }
  public initVoiceSynth(presetId?: VocalPresetId): void { EngineVocalActions.initSynth(this.voiceSynthManager, presetId, this.channels.instrumentChannels); }
  public applyVocalPreset(presetId: VocalPresetId): void { EngineVocalActions.applyPreset(this.voiceSynthManager, presetId, this.channels.instrumentChannels); }
  public getOrCreateVoiceSynth(trackId?: string | number): any { return EngineVocalActions.getOrCreateSynth(this.voiceSynthManager, trackId, this.channels.instrumentChannels); }
  public setInstrumentChannel(trackId: number | string, instId: string, channel: any): void { this.channels.setInstrumentChannel(this.audioContext, trackId, instId, channel); }
  public removeInstrumentChannel(trackId: number | string): void { this.channels.removeInstrumentChannel(trackId, this.voiceSynthManager.voiceSynths); }

  public async loadPath(path: string): Promise<void> { return EngineSampleActions.loadPath(this.audioContext, this.sampleLoader, path); }
  public async loadAllSamples(): Promise<void> { return EngineSampleActions.loadAllSamples(this.audioContext, this.sampleLoader); }
  public async loadInstrumentSamples(instId: string): Promise<void> { return EngineSampleActions.loadInstrumentSamples(this.audioContext, this.sampleLoader, this.configMap, instId); }
  public async loadStrokeSamples(instId: string, stroke: string): Promise<void> { return EngineSampleActions.loadStrokeSamples(this.audioContext, this.sampleLoader, this.configMap, instId, stroke); }
  public isStrokeLoaded(instId: string, stroke: string): boolean { return EngineSampleActions.isStrokeLoaded(this.sampleLoader, this.configMap, instId, stroke); }
  public async syncActiveInstrumentsMemory(activeInstruments: ActiveInstrumentData[]): Promise<void> {
    return EngineSampleActions.syncActiveInstrumentsMemory(this.audioContext, this.sampleLoader, this.configMap, activeInstruments);
  }

  public stopBarulho(instId: string, time?: number): void { this.barulho.stopBarulho(instId, time); } public stopAllBarulho(): void { this.barulho.stopAllBarulho(); }
  public purgeScheduledHits(): void {
    EnginePurge.purgeScheduledHits(
      this.audioContext, this.scheduledHits, this.activeGainNodes,
      (inst, g) => this.channels.releaseGainNode(this.audioContext, inst, g),
      (inst, s) => this.voiceGuard.removeActiveVoice(inst, s), this.barulho
    );
  }

  public dispose(): void {
    EngineDisposer.dispose({
      barulho: this.barulho, unsubscribeTracks: this.unsubscribeTracks, cleanupVisibility: this.cleanupVisibility,
      clock: this.clock, sampleLoader: this.sampleLoader, scheduledHits: this.scheduledHits,
      activeGainNodes: this.activeGainNodes, channels: this.channels, voiceSynthManager: this.voiceSynthManager
    });
    this.unsubscribeTracks = null; this.cleanupVisibility = null;
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    safeSuspendAudioContext();
  });
}
