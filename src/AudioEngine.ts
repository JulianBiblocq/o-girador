/**
 * BaqueMix - High-Precision Web Audio Lookahead Engine
 * 
 * Drives the sequencer's tick clock using a dual-scheduler strategy:
 *  1. Primary: Inline Web Worker thread setInterval (prevents tab-throttling in background).
 *  2. Fallback: Main thread setInterval (if Worker is blocked by Content Security Policy).
 * 
 * Mathematical Precision:
 *  - Anchored Time Reference: Eliminates floating-point accumulation drift.
 *    Instead of relative additions (nextTickTime += duration), it calculates timestamps
 *    using multiplication relative to a tempo-change anchor (anchorTime + (ticks * duration)).
 *  - Automatic Tempo Tracking: Instantly updates anchors when BPM changes.
 */
export class AudioEngine {
  private audioContext: AudioContext;
  private isPlaying: boolean = false;
  
  // Timing variables
  private readonly LOOKAHEAD_INTERVAL = 10.0; // ms
  private readonly SCHEDULE_AHEAD_TIME = 0.200; // seconds
  
  private nextTickTime: number = 0.0;
  
  // Math Anchors for Drift Elimination
  private anchorTime: number = 0.0;
  private anchorTickCount: number = 0;
  private lastTickDuration: number = 0.0;

  // Timer handlers
  private worker: Worker | null = null;
  private fallbackTimerId: number | null = null;

  // Callbacks
  private onTick: (time: number) => void;
  private getTickDuration: () => number;

  /**
   * @param {AudioContext} audioContext - Native AudioContext to drive the clock
   * @param {Function} onTick - Callback fired when a tick is reached: (time: number) => void
   * @param {Function} getTickDuration - Callback returning the duration of a single tick in seconds
   */
  constructor(
    audioContext: AudioContext,
    onTick: (time: number) => void,
    getTickDuration: () => number
  ) {
    this.audioContext = audioContext;
    this.onTick = onTick;
    this.getTickDuration = getTickDuration;

    this.initWorker();
  }

  private initWorker(): void {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    const workerCode = `
      let timerId = null;
      self.onmessage = function(e) {
        if (e.data.action === 'start') {
          if (timerId) clearInterval(timerId);
          const interval = e.data.interval || 10;
          timerId = setInterval(function() {
            postMessage('tick');
          }, interval);
        } else if (e.data.action === 'stop') {
          if (timerId) {
            clearInterval(timerId);
            timerId = null;
          }
        }
      };
    `;

    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = () => {
        if (this.isPlaying) {
          this.scheduler();
        }
      };
    } catch (err) {
      console.warn("AudioEngine: Web Worker creation blocked. Falling back to main-thread timers.", err);
      this.worker = null;
    }
  }

  /**
   * Start the scheduling loop
   */
  public start(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;
    
    // Initialize timing markers
    this.nextTickTime = this.audioContext.currentTime;
    this.anchorTime = this.nextTickTime;
    this.anchorTickCount = 0;
    this.lastTickDuration = this.getTickDuration();

    if (this.worker) {
      this.worker.postMessage({ action: 'start', interval: this.LOOKAHEAD_INTERVAL });
    } else {
      this.fallbackTimerId = window.setInterval(() => this.scheduler(), this.LOOKAHEAD_INTERVAL);
    }
  }

  /**
   * Stop the scheduling loop
   */
  public stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    if (this.worker) {
      this.worker.postMessage({ action: 'stop' });
    }
    
    if (this.fallbackTimerId !== null) {
      window.clearInterval(this.fallbackTimerId);
      this.fallbackTimerId = null;
    }
  }

  /**
   * Check if the engine is currently playing
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * The scheduler loop checks if any ticks fall within the lookahead window.
   * Uses anchor-multiplication to guarantee drift-free timing.
   */
  private scheduler(): void {
    if (!this.isPlaying) return;

    const currentTime = this.audioContext.currentTime;

    // Clock Drift Recovery: if the scheduler falls behind due to heavy main-thread lag,
    // catch up instantly by resetting anchors to current context time.
    if (this.nextTickTime < currentTime) {
      this.nextTickTime = currentTime;
      this.anchorTime = currentTime;
      this.anchorTickCount = 0;
    }

    // Schedule events in advance
    while (this.nextTickTime < currentTime + this.SCHEDULE_AHEAD_TIME) {
      console.log("⏱️⏱️⏱️ [AUDIO_ENGINE_SCHEDULER] Scheduling tick at nextTickTime: " + this.nextTickTime + " | currentTime: " + currentTime);
      // Execute the tick callback (triggers synthesizers or players)
      this.onTick(this.nextTickTime);

      // Retrieve current tick duration (dependent on dynamic BPM)
      const tickDuration = this.getTickDuration();

      // If the tempo (tick duration) changes, reset the anchor to this tick time
      // to avoid calculating past ticks with the new duration.
      if (Math.abs(tickDuration - this.lastTickDuration) > 1e-6) {
        this.anchorTime = this.nextTickTime;
        this.anchorTickCount = 0;
        this.lastTickDuration = tickDuration;
      }

      this.anchorTickCount++;

      // Absolute calculation within the current tempo segment
      this.nextTickTime = this.anchorTime + (this.anchorTickCount * tickDuration);
    }
  }
}
