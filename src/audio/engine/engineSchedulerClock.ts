/**
 * O Girador - Audio Engine High-Precision Lookahead Scheduler & Clock
 */

import { getTone } from '../../ToneLoader';
import { createEngineClock, WorkletClockHandle } from './engineClockWorklet';

export interface ClockCallbacks {
  onTick: (time: number) => boolean | void;
  getTickDuration: () => number;
  getTicksPerMeasure: (measureIdx: number) => number;
  purgeScheduledHits: () => void;
  onPositionJump?: ((step: number, measure: number) => void) | null;
}

export class EngineSchedulerClock {
  public isPlaying: boolean = false;
  public LOOKAHEAD_INTERVAL: number = 25.0;
  public SCHEDULE_AHEAD_TIME: number = 0.350;
  public nextTickTime: number = 0.0;
  public sequenceStartTime: number = 0.0;
  public currentStep: number = 0;
  public currentMeasure: number = 0;
  public schedulingStep: number = 0;
  public schedulingMeasure: number = 0;

  private anchorNoteTime: number = 0.0;
  private anchorStep: number = 0;
  private lastSchedulingMeasure: number = -1;
  private mustReanchor: boolean = false;
  private isScheduling: boolean = false;
  private clockHandle: WorkletClockHandle;

  constructor(
    private audioContext: AudioContext,
    private callbacks: ClockCallbacks
  ) {
    this.updateSchedulingParameters();
    this.clockHandle = createEngineClock(audioContext, this.LOOKAHEAD_INTERVAL, () => {
      if (this.isPlaying) this.scheduler();
    });
  }

  public updateSchedulingParameters(): void {
    this.SCHEDULE_AHEAD_TIME = 0.350;
    this.LOOKAHEAD_INTERVAL = 25.0;

    try {
      const Tone = getTone();
      if (Tone?.context) Tone.context.lookAhead = 0.35;
      if (Tone?.Transport) (Tone.Transport as any).scheduleAheadTime = 0.35;
    } catch (_) {}

    if (!this.clockHandle?.hasWorkletTicked && !this.clockHandle?.clockNode && this.isPlaying && this.clockHandle?.fallbackTimerId !== null) {
      window.clearInterval(this.clockHandle.fallbackTimerId);
      this.clockHandle.fallbackTimerId = window.setInterval(() => {
        if (this.isPlaying) this.scheduler();
      }, this.LOOKAHEAD_INTERVAL);
    }
  }

  public start(scheduledStartTime?: number): void {
    if (this.isPlaying) return;
    this.nextTickTime = scheduledStartTime !== undefined ? scheduledStartTime : (this.audioContext.currentTime + 0.025);
    this.schedulingStep = this.currentStep;
    this.schedulingMeasure = this.currentMeasure;
    this.anchorNoteTime = this.nextTickTime;
    this.anchorStep = this.schedulingStep;
    this.lastSchedulingMeasure = -1;
    this.mustReanchor = false;

    const tickDuration = this.callbacks.getTickDuration();
    let priorSteps = 0;
    for (let m = 0; m < this.schedulingMeasure; m++) priorSteps += this.callbacks.getTicksPerMeasure(m);
    priorSteps += this.schedulingStep;
    this.sequenceStartTime = this.nextTickTime - (priorSteps * tickDuration);

    this.isPlaying = true;
    this.scheduler();
  }

  public stop(): void {
    this.isPlaying = false;
    this.isScheduling = false;
    this.currentStep = 0; this.currentMeasure = 0;
    this.schedulingStep = 0; this.schedulingMeasure = 0;
    this.anchorStep = 0; this.anchorNoteTime = 0;
    this.nextTickTime = 0; this.lastSchedulingMeasure = -1;
    this.mustReanchor = false; this.sequenceStartTime = 0;
  }

  public forceReanchor(): void {
    if (!this.isPlaying) return;
    this.nextTickTime = this.audioContext.currentTime + 0.025;
    this.mustReanchor = true;
  }

  public scheduler(): void {
    if (!this.isPlaying || this.isScheduling) return;
    this.isScheduling = true;
    try {
      const cur = this.audioContext.currentTime;
      // Verrouillage monotone : ne ré-ancre que sur vraie suspension matérielle (> 6.0 s) ou forceReanchor explicite
      if (this.nextTickTime < cur - 6.0) {
        this.callbacks.purgeScheduledHits();
        this.nextTickTime = cur + 0.035;
        this.mustReanchor = true;
      }
      let iterations = 0;
      while (this.isPlaying && this.nextTickTime < cur + this.SCHEDULE_AHEAD_TIME && iterations++ < 512) {
        const prev = this.nextTickTime;
        this.callbacks.onTick(this.nextTickTime);
        if (!this.isPlaying) break;
        const tickDur = this.callbacks.getTickDuration();
        if (this.schedulingStep === 0 || this.schedulingMeasure !== this.lastSchedulingMeasure || this.mustReanchor) {
          this.anchorNoteTime = this.nextTickTime;
          this.anchorStep = this.schedulingStep;
          this.lastSchedulingMeasure = this.schedulingMeasure;
          this.mustReanchor = false;
        }
        this.nextTickTime = this.anchorNoteTime + ((this.schedulingStep + 1 - this.anchorStep) * tickDur);
        if (this.nextTickTime <= prev) break;
      }
    } finally {
      this.isScheduling = false;
    }
  }

  public dispose(): void {
    if (this.clockHandle?.clockNode) {
      try { this.clockHandle.clockNode.port.onmessage = null; this.clockHandle.clockNode.disconnect(); } catch (_) {}
      this.clockHandle.clockNode = null;
    }
    if (this.clockHandle?.fallbackTimerId) {
      window.clearInterval(this.clockHandle.fallbackTimerId);
      this.clockHandle.fallbackTimerId = null;
    }
    if (this.clockHandle) this.clockHandle.hasWorkletTicked = false;
  }
}
