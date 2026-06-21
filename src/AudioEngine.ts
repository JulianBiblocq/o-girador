/**
 * O Girador - High-Precision Web Audio Lookahead Engine & Sampler
 * 
 * Drives the sequencer's tick clock using a dual-scheduler strategy:
 *  1. Primary: Inline Web Worker thread setInterval (prevents tab-throttling in background).
 *  2. Fallback: Main thread setInterval (if Worker is blocked by Content Security Policy).
 * 
 * Drives Sample playback using Web Audio API:
 *  - Memory Pooling: Deduplicates loaded AudioBuffers by absolute file path.
 *  - Strict Round-Robin: Avoids repeating the same audio file twice in a row when size > 1.
 *  - Micro-pitching (Humanize): Applies a random pitch variation (±2% for most, ±0.7% for Alfaias) to each non-barulho, non-gonguê hit.
 *  - Macro-pitching: Handles instrument transpositions (e.g. Alfaias Marcante 0.85, Meião 1.0, Repique 1.15).
 *  - Barulho Loop: Loops barulho sounds on keydown and stops them on keyup.
 */

import * as Tone from 'tone';
import { instrumentAudioConfigs, StrokeMapping, InstrumentAudioConfig } from './data/audioConfig';

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

  // Sampler State & Buffers
  private bufferPool = new Map<string, Tone.ToneAudioBuffer>(); // Maps absolute path -> ToneAudioBuffer (Sample Pooling)
  private lastPlayedIndices = new Map<string, number>(); // Maps "instrumentId_strokeSymbol" -> last played index (Round-Robin)
  private instrumentChannels = new Map<string, any>(); // Maps instrumentId -> Tone.Channel
  private activeBarulhoNodes = new Map<string, AudioBufferSourceNode>(); // Maps instrumentId -> active looping BufferSource
  private activeBarulhoGains = new Map<string, GainNode>(); // Maps instrumentId -> GainNode of active Barulho
  private scheduledHits = new Set<AudioBufferSourceNode>();

  // O(1) lookup cache for instrument configurations (built once in constructor)
  private readonly configMap: Map<string, InstrumentAudioConfig>;

  /**
   * @param {AudioContext} audioContext - Native AudioContext to drive the clock and play samples
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

    // Pre-build O(1) config lookup map (avoids Array.find() on every note played)
    this.configMap = new Map(instrumentAudioConfigs.map(c => [c.id, c]));

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
      URL.revokeObjectURL(workerUrl); // Libérer immédiatement la Blob URL — le Worker est déjà chargé

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

    this.scheduledHits.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (_) {}
    });
    this.scheduledHits.clear();
  }

  /**
   * Check if the engine is currently playing
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Returns the current AudioContext time (used by InputManager for precise scheduling)
   */
  public getCurrentTime(): number {
    return this.audioContext.currentTime;
  }

  /**
   * The scheduler loop checks if any ticks fall within the lookahead window.
   */
  private scheduler(): void {
    if (!this.isPlaying) return;

    const currentTime = this.audioContext.currentTime;

    // Clock Drift Recovery
    if (this.nextTickTime < currentTime) {
      this.nextTickTime = currentTime;
      this.anchorTime = currentTime;
      this.anchorTickCount = 0;
    }

    // Schedule events in advance
    while (this.nextTickTime < currentTime + this.SCHEDULE_AHEAD_TIME) {
      this.onTick(this.nextTickTime);

      const tickDuration = this.getTickDuration();

      if (Math.abs(tickDuration - this.lastTickDuration) > 1e-6) {
        this.anchorTime = this.nextTickTime;
        this.anchorTickCount = 0;
        this.lastTickDuration = tickDuration;
      }

      this.anchorTickCount++;
      this.nextTickTime = this.anchorTime + (this.anchorTickCount * tickDuration);
    }
  }

  /**
   * Preload all unique audio files mapped in instrumentAudioConfigs to memory.
   * Leverages caching to guarantee sample pooling (duplicate files are only loaded once).
   */
  private async loadPath(path: string): Promise<void> {
    if (this.bufferPool.has(path)) return;
    try {
      let fetchPath = path;
      if (path.includes('Mixdown/') || path.includes('mixdown/')) {
        const filename = path.substring(path.lastIndexOf('/') + 1);
        // @ts-ignore
        fetchPath = `${import.meta.env.BASE_URL || '/'}Mixdown/${filename}`;
      } else {
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        // @ts-ignore
        const baseUrl = import.meta.env.BASE_URL || '/';
        fetchPath = baseUrl.endsWith('/') ? baseUrl + cleanPath.slice(1) : baseUrl + cleanPath;
      }
      const encodedFetchPath = fetchPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
      
      let response = await fetch(encodedFetchPath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      let arrayBuffer = await response.arrayBuffer();
      
      try {
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);
        this.bufferPool.set(path, toneBuffer);
      } catch (decodeErr) {
        console.warn(`AudioEngine: Safari/iOS fallback triggered for ${path}. Attempting .m4a`);
        const fallbackPath = encodedFetchPath.replace(/\.ogg$/, '.m4a');
        response = await fetch(fallbackPath);
        if (!response.ok) {
          throw new Error(`Fallback HTTP error! status: ${response.status}`);
        }
        arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);
        this.bufferPool.set(path, toneBuffer);
      }
    } catch (err) {
      console.error(`AudioEngine: Failed to load sample: ${path}`, err);
    }
  }

  public async loadAllSamples(): Promise<void> {
    const pathsArray: string[] = [];
    for (const config of instrumentAudioConfigs) {
      for (const stroke of config.strokes) {
        for (const file of stroke.files) {
          pathsArray.push(file);
        }
      }
    }
    await Promise.all(pathsArray.map(p => this.loadPath(p)));
  }

  /**
   * Dynamically unloads unused instrument buffers to save RAM.
   * Useful for mobile devices where holding all samples in memory can cause crashes.
   */
  public async syncActiveInstrumentsMemory(activeIndexes: number[]): Promise<void> {
    const requiredPaths = new Set<string>();

    for (const index of activeIndexes) {
      if (instrumentAudioConfigs[index]) {
        for (const stroke of instrumentAudioConfigs[index].strokes) {
          for (const file of stroke.files) {
            requiredPaths.add(file);
          }
        }
      }
    }

    // Unload buffers that are no longer needed
    const keysToDelete: string[] = [];
    for (const [path, buffer] of this.bufferPool.entries()) {
      if (!requiredPaths.has(path)) {
        try {
          buffer.dispose(); // Free up memory in Tone.js/WebAudio
        } catch(e) {
          // Ignore WebAudio disposal errors on old tablets
        }
        keysToDelete.push(path);
      }
    }
    keysToDelete.forEach(k => {
      this.bufferPool.delete(k);
    });

    // Load missing buffers sequentially to avoid crashing Safari/Webkit on old tablets
    const pathsToLoad = Array.from(requiredPaths).filter(p => !this.bufferPool.has(p));
    
    // Batch processing: load 3 samples at a time
    for (let i = 0; i < pathsToLoad.length; i += 3) {
      const batch = pathsToLoad.slice(i, i + 3);
      await Promise.all(batch.map(p => this.loadPath(p)));
    }
  }

  public async loadInstrumentSamples(instrumentIndex: number): Promise<void> {
    const pathsArray: string[] = [];
    if (instrumentAudioConfigs[instrumentIndex]) {
      for (const stroke of instrumentAudioConfigs[instrumentIndex].strokes) {
        for (const file of stroke.files) {
          pathsArray.push(file);
        }
      }
    }
    await Promise.all(pathsArray.map(p => this.loadPath(p)));
  }

  /**
   * Register output destination / channel for an instrument ID
   */
  public setInstrumentChannel(instrumentId: string, channel: any): void {
    this.instrumentChannels.set(instrumentId, channel);
  }

  /**
   * Plays a specific stroke for an instrument with velocity, decay, round-robin, and pitching.
   */
  public playNote(
    instrumentId: string,
    strokeSymbol: string,
    time: number,
    velocity: number,
    decayMultiplier: number
  ): void {
    // 1. Find the configuration for this instrument — O(1) Map lookup instead of O(n) Array.find()
    const config = this.configMap.get(instrumentId);
    if (!config) {
      console.warn(`AudioEngine: Unknown instrument ID: ${instrumentId}`);
      return;
    }

    let normSymbol = strokeSymbol;

    // Normalizations for legacy sequencer symbol compatibilities
    // Note: G→E normalization for Alfaias removed — symbols are now canonical and unambiguous.
    if (['marcante', 'meiao', 'repique', 'caixa', 'tarol'].includes(instrumentId)) {
      if (normSymbol === 't' || normSymbol === 'T') normSymbol = 'B';
      else if (normSymbol === 'C') normSymbol = 'c';
    } else if (instrumentId === 'agbe') {
      if (normSymbol === 't') normSymbol = 'B';
    } else if (instrumentId === 'gongue') {
      if (normSymbol === 't') normSymbol = 'B';
    }

    // 2. Find the stroke mapping
    const stroke = config.strokes.find(s => s.symbol === normSymbol);
    if (!stroke || stroke.files.length === 0) {
      // Fallback matching if symbol casing differs (for case-insensitive actions)
      const fallbackStroke = config.strokes.find(s => s.symbol.toUpperCase() === normSymbol.toUpperCase());
      if (!fallbackStroke || fallbackStroke.files.length === 0) {
        console.warn(`AudioEngine: No stroke mapped for symbol "${strokeSymbol}" (normalized: "${normSymbol}") on instrument "${instrumentId}"`);
        return;
      }
      this.playStroke(instrumentId, config, fallbackStroke, time, velocity, decayMultiplier);
      return;
    }

    this.playStroke(instrumentId, config, stroke, time, velocity, decayMultiplier);
  }

  /**
   * Helper to perform play and pitching of a specific stroke mapping
   */
  private playStroke(
    instrumentId: string,
    config: InstrumentAudioConfig,
    stroke: StrokeMapping,
    time: number,
    velocity: number,
    decayMultiplier: number
  ): void {
    // 1. Round-Robin Index Selection
    const rrKey = `${instrumentId}_${stroke.symbol}`;
    const numFiles = stroke.files.length;
    let chosenIdx = 0;

    if (numFiles > 1) {
      const lastIdx = this.lastPlayedIndices.has(rrKey) ? this.lastPlayedIndices.get(rrKey)! : -1;
      const availableIndices: number[] = [];
      for (let i = 0; i < numFiles; i++) {
        if (i !== lastIdx) {
          availableIndices.push(i);
        }
      }
      chosenIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      this.lastPlayedIndices.set(rrKey, chosenIdx);
    } else {
      this.lastPlayedIndices.set(rrKey, 0);
    }

    const filePath = stroke.files[chosenIdx];
    const buffer = this.bufferPool.get(filePath);

    if (!buffer) {
      console.warn(`AudioEngine: Buffer not loaded for path: ${filePath}`);
      return;
    }

    // 3. Pitch Calculations (Macro & Micro/Humanization)
    let macroPitch = config.macroPitch !== undefined ? config.macroPitch : 1.0;
    
    // Organically vary the playback rate unless it is a Barulho or Gonguê
    let microPitch = 1.0;
    if (!stroke.isBarulho && instrumentId !== 'gongue') {
      if (['marcante', 'meiao', 'repique'].includes(instrumentId)) {
        microPitch = 0.993 + Math.random() * 0.014; // Subtle +/- 0.7% variation
      } else {
        microPitch = 0.98 + Math.random() * 0.04; // Normal +/- 2% variation
      }
    }

    const calculatedPitch = macroPitch * microPitch;

    // 4. Instantiation Native Web Audio API (Faster on slow devices)
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer.get() as AudioBuffer;
    source.playbackRate.value = calculatedPitch;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = velocity;

    source.connect(gainNode);

    // 5. Connect to the mapped channel (or fallback to Master Destination)
    const channel = this.instrumentChannels.get(instrumentId);
    if (channel) {
      Tone.connect(gainNode, channel);
    } else {
      Tone.connect(gainNode, Tone.Destination);
    }

    // Choke any existing looping barulho for this instrument
    this.stopBarulho(instrumentId, time);

    // 6. Handle play duration and looping
    if (stroke.isBarulho) {
      source.loop = true;
      source.start(time);
      this.activeBarulhoNodes.set(instrumentId, source);
      this.activeBarulhoGains.set(instrumentId, gainNode);
    } else {
      this.scheduledHits.add(source);
      const duration = buffer.duration * decayMultiplier;
      if (decayMultiplier < 1.0) {
        source.start(time, 0, duration);
      } else {
        source.start(time);
      }

      source.onended = () => {
        this.scheduledHits.delete(source);
        try { source.disconnect(); } catch (_) {}
        try { gainNode.disconnect(); } catch (_) {}
      };
    }

    if (instrumentId === 'apito') {
      Tone.Draw.schedule(() => {
        window.dispatchEvent(new CustomEvent('o-girador-apito-shake'));
      }, time);
    }
  }

  /**
   * Stops looping Barulho sounds for a specific instrument
   */
  public stopBarulho(instrumentId: string, time: number = this.audioContext.currentTime): void {
    const activeNode = this.activeBarulhoNodes.get(instrumentId);
    if (activeNode) {
      try {
        activeNode.stop(time);
      } catch (_) {
        // Source might have been stopped already
      }
      this.activeBarulhoNodes.delete(instrumentId);
    }
    // Always dispose the gainNode to prevent audio graph leaks
    const activeGain = this.activeBarulhoGains.get(instrumentId);
    if (activeGain) {
      try { activeGain.disconnect(); } catch (_) {}
      this.activeBarulhoGains.delete(instrumentId);
    }
  }

  /**
   * Stop all active looping Barulho sounds
   */
  public stopAllBarulho(): void {
    const keys = Array.from(this.activeBarulhoNodes.keys());
    for (const key of keys) {
      this.stopBarulho(key);
    }
  }
}
