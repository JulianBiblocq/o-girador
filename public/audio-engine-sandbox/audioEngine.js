/**
 * BaqueMix - High-Precision Web Audio Sequencer Engine
 * 
 * Drives the sequencer's tick clock using a dual-scheduler strategy:
 *  1. Primary: Inline Web Worker thread setInterval (prevents tab-throttling in background).
 *  2. Fallback: Main thread setInterval (if Worker is blocked by Content Security Policy).
 * 
 * Mathematical Precision:
 *  - Anchored Time Reference: Eliminates floating-point accumulation drift.
 *    Instead of relative additions (nextNoteTime += duration), it calculates timestamps
 *    using multiplication relative to a tempo-change anchor (anchorTime + (ticks * duration)).
 *  - Automatic Tempo Tracking: Instantly updates anchors when BPM changes.
 */
export class AudioEngine {
  /**
   * @param {Object} options
   * @param {number} [options.bpm=120] - Tempo in beats per minute
   * @param {number} [options.subdivision=4] - Number of steps per beat (4 = 16th notes)
   * @param {number} [options.loopLength=16] - Total steps in a loop sequence
   * @param {function} [options.onStep] - Callback fired when scheduling a step: (stepNumber, audioTime)
   */
  constructor({
    bpm = 120,
    subdivision = 4,
    loopLength = 16,
    onStep = null
  } = {}) {
    this.bpm = bpm;
    this.subdivision = subdivision;
    this.loopLength = loopLength;
    this.onStep = onStep;

    // Audio Context & Output Nodes
    this.audioContext = null;
    this.masterGain = null;

    // Sequencer State
    this.isPlaying = false;
    this.currentStep = 0;
    this.nextNoteTime = 0.0;

    // Timing parameters
    this.LOOKAHEAD_INTERVAL = 10.0; // run loop every 10ms
    this.SCHEDULE_AHEAD_TIME = 0.200; // schedule events 200ms in advance
    
    // Math Anchors for Drift Elimination
    this.anchorTime = 0.0;
    this.anchorTickCount = 0;
    this.lastTickDuration = 0.0;

    // Timer handlers
    this.worker = null;
    this.fallbackTimerId = null;

    this.initWorker();
  }

  /**
   * Instantiates an inline Web Worker to act as our high-precision tick generator.
   */
  initWorker() {
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
   * Initialise standard AudioContext and master volume.
   */
  initAudio() {
    if (this.audioContext) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass();

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
    this.masterGain.connect(this.audioContext.destination);

    console.log("AudioEngine: AudioContext & Master Gain Node successfully initialized.");
  }

  /**
   * Start playback.
   */
  async play() {
    this.initAudio();

    if (this.isPlaying) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isPlaying = true;
    this.currentStep = 0;
    
    // Initialize timing markers
    this.nextNoteTime = this.audioContext.currentTime;
    this.anchorTime = this.nextNoteTime;
    this.anchorTickCount = 0;
    this.lastTickDuration = this.getTickDuration();

    if (this.worker) {
      this.worker.postMessage({ action: 'start', interval: this.LOOKAHEAD_INTERVAL });
    } else {
      this.fallbackTimerId = setInterval(() => this.scheduler(), this.LOOKAHEAD_INTERVAL);
    }
    
    console.log("AudioEngine: Playback started at BPM:", this.bpm);
  }

  /**
   * Stop playback and reset scheduler.
   */
  stop() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    
    if (this.worker) {
      this.worker.postMessage({ action: 'stop' });
    }
    
    if (this.fallbackTimerId !== null) {
      clearInterval(this.fallbackTimerId);
      this.fallbackTimerId = null;
    }
    
    this.currentStep = 0;
    console.log("AudioEngine: Playback stopped.");
  }

  /**
   * The core scheduling loop.
   * Uses anchor-multiplication to guarantee drift-free timing.
   */
  scheduler() {
    if (!this.isPlaying) return;

    const currentTime = this.audioContext.currentTime;

    // Clock Drift Recovery
    if (this.nextNoteTime < currentTime) {
      this.nextNoteTime = currentTime;
      this.anchorTime = currentTime;
      this.anchorTickCount = 0;
    }

    // Schedule events in advance
    while (this.nextNoteTime < currentTime + this.SCHEDULE_AHEAD_TIME) {
      // Execute step callback
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      
      if (this.onStep) {
        this.onStep(this.currentStep, this.nextNoteTime);
      }

      // Retrieve current tick duration
      const tickDuration = this.getTickDuration();

      // If BPM changes, update the anchor to prevent calculation drift
      if (Math.abs(tickDuration - this.lastTickDuration) > 1e-6) {
        this.anchorTime = this.nextNoteTime;
        this.anchorTickCount = 0;
        this.lastTickDuration = tickDuration;
      }

      this.anchorTickCount++;

      // Absolute calculation within current tempo segment
      this.nextNoteTime = this.anchorTime + (this.anchorTickCount * tickDuration);

      // Logical step advance
      this.currentStep = (this.currentStep + 1) % this.loopLength;
    }
  }

  /**
   * Return tick duration in seconds.
   */
  getTickDuration() {
    const secondsPerBeat = 60.0 / this.bpm;
    return secondsPerBeat / this.subdivision;
  }

  /**
   * Metronome click oscillator generator.
   */
  scheduleNote(stepNumber, time) {
    if (!this.audioContext || !this.masterGain) return;

    const isFirstStep = stepNumber === 0;
    const isQuarterBeat = stepNumber % this.subdivision === 0;

    let freq = 400;
    let gainVal = 0.2;
    let decay = 0.03;

    if (isFirstStep) {
      freq = 1200;
      gainVal = 0.6;
      decay = 0.08;
    } else if (isQuarterBeat) {
      freq = 800;
      gainVal = 0.4;
      decay = 0.05;
    }

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(10, time + decay);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(gainVal, time + 0.002);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    osc.start(time);
    osc.stop(time + decay + 0.01);
  }

  /**
   * Set BPM dynamically.
   */
  setBpm(value) {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      this.bpm = parsed;
    }
  }

  /**
   * Set Master Volume.
   */
  setVolume(value) {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && this.masterGain) {
      const now = this.audioContext ? this.audioContext.currentTime : 0;
      this.masterGain.gain.setTargetAtTime(parsed, now, 0.01);
    }
  }

  /**
   * Get current hardware audio clock time.
   */
  getCurrentAudioTime() {
    return this.audioContext ? this.audioContext.currentTime : 0;
  }
}
