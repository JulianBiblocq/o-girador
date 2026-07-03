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

import type * as ToneType from 'tone';
import { getTone } from './ToneLoader';
import { instrumentAudioConfigs, StrokeMapping, InstrumentAudioConfig } from './data/audioConfig';

interface ActiveVoice {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  time: number;
  velocity: number;
  instrumentId: string;
}

export class AudioEngine {
  private audioContext: AudioContext;
  private isPlaying: boolean = false;
  private readonly MAX_POOL_SIZE: number = 40;
  
  // Timing variables (adaptive to device capabilities)
  public LOOKAHEAD_INTERVAL: number = 25.0; // ms
  public SCHEDULE_AHEAD_TIME: number = 0.500; // seconds
  private nextTickTime: number = 0.0;
  
  // Math Anchors for Drift Elimination
  private anchorTime: number = 0.0;
  private anchorTickCount: number = 0;
  private lastTickDuration: number = 0.0;

  // Timer handlers
  private clockNode: AudioWorkletNode | null = null;
  private fallbackTimerId: number | null = null;

  // Callbacks
  private onTick: (time: number) => void;
  private getTickDuration: () => number;

  // Sampler State & Buffers
  private bufferPool = new Map<string, ToneType.ToneAudioBuffer>(); // Maps absolute path -> ToneAudioBuffer (Sample Pooling)
  private lastPlayedIndices = new Map<string, number>(); // Maps "instrumentId_strokeSymbol" -> last played index (Round-Robin)
  private instrumentChannels = new Map<string, any>(); // Maps instrumentId -> Tone.Channel
  private activeBarulhoNodes = new Map<string, AudioBufferSourceNode>(); // Maps instrumentId -> active looping BufferSource
  private activeBarulhoGains = new Map<string, GainNode>(); // Maps instrumentId -> GainNode of active Barulho
  private scheduledHits = new Set<AudioBufferSourceNode>();
  private activeGainNodes = new Map<AudioBufferSourceNode, { instrumentId: string; gainNode: GainNode }>(); // Precise tracking to avoid leaks
  private gainNodePools = new Map<string, GainNode[]>(); // Maps instrumentId -> pooled GainNodes connected to channel
  private instrumentVoices = new Map<string, ActiveVoice[]>(); // Track active/scheduled voices for eco mode polyphony limits

  // O(1) lookup cache for instrument configurations (built once in constructor)
  private readonly configMap: Map<string, InstrumentAudioConfig>;

  private handleVisibilityChange = () => {
    this.updateSchedulingParameters();
  };

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

    this.updateSchedulingParameters();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    // Pre-build O(1) config lookup map (avoids Array.find() on every note played)
    this.configMap = new Map(instrumentAudioConfigs.map(c => [c.id, c]));

    const nativeContext =
      (audioContext as any)._nativeContext ||
      (audioContext as any).rawContext ||
      (audioContext as any)._context ||
      audioContext;

    if (typeof nativeContext.audioWorklet === 'undefined') {
      console.warn("AudioEngine: AudioWorklet not supported. Falling back to setInterval timer.");
      this.initFallbackTimer();
    } else {
      this.initClockWorklet().catch(err => {
        console.error("AudioEngine: Error initializing clock worklet:", err);
        this.initFallbackTimer();
      });
    }
  }

  private updateSchedulingParameters(): void {
    const isMobile = 'ontouchstart' in globalThis || navigator.maxTouchPoints > 0;
    const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const isDesktopActive = !isMobile && !isHidden;

    const hwLatency = (this.audioContext.baseLatency || 0.05) + ((this.audioContext as any).outputLatency || 0.05);

    this.SCHEDULE_AHEAD_TIME = Math.max(0.150, hwLatency + 0.050);

    this.LOOKAHEAD_INTERVAL = isDesktopActive ? 15.0 : 25.0;

    // Dynamically update interval of fallback timer if active and playing
    if (this.isPlaying && !this.clockNode && this.fallbackTimerId !== null) {
      window.clearInterval(this.fallbackTimerId);
      this.fallbackTimerId = window.setInterval(() => {
        if (this.isPlaying) {
          this.scheduler();
        }
      }, this.LOOKAHEAD_INTERVAL);
    }
  }

  private async initClockWorklet(): Promise<void> {
    try {
      // @ts-ignore
      const baseUrl = import.meta.env.BASE_URL || '/';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      const workletUrl = `${cleanBase}clock.worklet.js`;

      const nativeContext =
        (this.audioContext as any)._nativeContext ||
        (this.audioContext as any).rawContext ||
        (this.audioContext as any)._context ||
        this.audioContext;

      await nativeContext.audioWorklet.addModule(workletUrl);
      
      this.clockNode = new AudioWorkletNode(nativeContext, 'clock-processor');
      this.clockNode.port.onmessage = () => {
        if (this.isPlaying) {
          this.scheduler();
        }
      };
      this.clockNode.connect(nativeContext.destination);
    } catch (err) {
      console.warn("AudioEngine: Failed to initialize clock AudioWorklet. Falling back to setInterval clock.", err);
      this.initFallbackTimer();
    }
  }

  private initFallbackTimer(): void {
    if (this.clockNode) return;
    if (this.fallbackTimerId === null) {
      this.fallbackTimerId = window.setInterval(() => {
        if (this.isPlaying) {
          this.scheduler();
        }
      }, this.LOOKAHEAD_INTERVAL);
    }
  }

  /**
   * Start the scheduling loop
   */
  public start(): void {
    if (this.isPlaying) return;

    // Initialize timing markers
    this.nextTickTime = this.audioContext.currentTime;
    this.anchorTime = this.nextTickTime;
    this.anchorTickCount = 0;
    this.lastTickDuration = this.getTickDuration();

    this.isPlaying = true;
  }

  /**
   * Stop the scheduling loop
   */
  public stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    this.scheduledHits.forEach((source) => {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch (_) {}
    });
    this.scheduledHits.clear();

    // Release any active gain nodes to prevent leaks on stop
    this.activeGainNodes.forEach(({ instrumentId, gainNode }) => {
      this.releaseGainNode(instrumentId, gainNode);
    });
    this.activeGainNodes.clear();
    this.instrumentVoices.clear();
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
      const drift = currentTime - this.nextTickTime;
      if (drift > 1.0) {
        // En cas de longue suspension (veille/arrière-plan), on réinitialise l'horloge
        this.nextTickTime = currentTime;
        this.anchorTime = currentTime;
        this.anchorTickCount = 0;
      }
      // En cas de micro-lag (< 1.0s), on laisse la boucle while rattraper naturellement
      // les ticks pour préserver l'alignement du step index.
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
    const Tone = getTone();
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
        try {
          response = await fetch(fallbackPath);
          if (!response.ok) {
            console.warn(`AudioEngine: Fallback .m4a not found or failed to load for ${path} (status: ${response.status})`);
            return;
          }
          arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);
          this.bufferPool.set(path, toneBuffer);
        } catch (fallbackErr) {
          console.warn(`AudioEngine: Failed to load fallback .m4a for ${path}:`, fallbackErr);
        }
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
  public async syncActiveInstrumentsMemory(activeIds: string[]): Promise<void> {
    const requiredPaths = new Set<string>();

    for (const id of activeIds) {
      const config = this.configMap.get(id);
      if (config) {
        for (const stroke of config.strokes) {
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

  public async loadInstrumentSamples(instrumentId: string): Promise<void> {
    const pathsArray: string[] = [];
    const config = this.configMap.get(instrumentId);
    if (config) {
      for (const stroke of config.strokes) {
        for (const file of stroke.files) {
          pathsArray.push(file);
        }
      }
    }
    await Promise.all(pathsArray.map(p => this.loadPath(p)));
  }

  /**
   * Register output destination / channel for an instrument ID
   * and initialize its dedicated GainNode pool.
   */
  public setInstrumentChannel(instrumentId: string, channel: any): void {
    this.instrumentChannels.set(instrumentId, channel);
    const Tone = getTone();
    
    if (!this.gainNodePools.has(instrumentId)) {
      const pool: GainNode[] = [];
      for (let i = 0; i < 15; i++) {
        const gainNode = this.audioContext.createGain();
        (gainNode as any)._isReleased = true;
        gainNode.gain.value = 0;
        Tone.connect(gainNode, channel);
        pool.push(gainNode);
      }
      this.gainNodePools.set(instrumentId, pool);
    }
  }

  /**
   * Retourne la limite de polyphonie d'un instrument en mode éco.
   */
  private getPolyphonyLimit(instrumentId: string): number {
    switch (instrumentId) {
      case 'caixa':
      case 'tarol':
      case 'agbe':
      case 'mineiro':
      case 'apito':
        return 1;
      case 'marcante':
      case 'meiao':
      case 'repique':
      case 'gongue':
        return 2;
      default:
        return 2;
    }
  }

  private getGainNode(instrumentId: string): GainNode {
    const Tone = getTone();
    const pool = this.gainNodePools.get(instrumentId);
    if (pool && pool.length > 0) {
      const gainNode = pool.pop()!;
      (gainNode as any)._isReleased = false;
      return gainNode;
    }
    // Fallback dynamique
    const gainNode = this.audioContext.createGain();
    (gainNode as any)._isReleased = false;
    gainNode.gain.value = 0;
    const channel = this.instrumentChannels.get(instrumentId);
    if (channel) {
      Tone.connect(gainNode, channel);
    } else {
      Tone.connect(gainNode, Tone.Destination);
    }
    return gainNode;
  }

  /**
   * Nettoie strictement le nœud de volume et le rend à la piscine.
   */
  private releaseGainNode(instrumentId: string, gainNode: GainNode): void {
    if ((gainNode as any)._isReleased) return;
    (gainNode as any)._isReleased = true;

    const currentTime = this.audioContext.currentTime;
    try {
      gainNode.gain.cancelScheduledValues(currentTime);
      gainNode.gain.setValueAtTime(0, currentTime);
    } catch (_) {}
    
    const pool = this.gainNodePools.get(instrumentId);
    if (pool && pool.length < this.MAX_POOL_SIZE) {
      pool.push(gainNode);
    }
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
    const Tone = getTone();
    // If it's a Barulho stroke and already looping, just adjust volume and continue seamlessly
    if (stroke.isBarulho && this.activeBarulhoNodes.has(instrumentId)) {
      const activeGain = this.activeBarulhoGains.get(instrumentId);
      if (activeGain) {
        try {
          activeGain.gain.cancelScheduledValues(time);
          activeGain.gain.setValueAtTime(activeGain.gain.value, time);
          activeGain.gain.linearRampToValueAtTime(velocity, time + 0.1);
        } catch (_) {}
      }
      return;
    }

    // If it's NOT a barulho, choke any existing looping barulho for this instrument
    if (!stroke.isBarulho) {
      this.stopBarulho(instrumentId, time);
    }

    // 1. Round-Robin Index Selection
    const rrKey = `${instrumentId}_${stroke.symbol}`;
    const numFiles = stroke.files.length;
    let chosenIdx = 0;

    if (numFiles > 1) {
      const lastIdx = this.lastPlayedIndices.has(rrKey) ? this.lastPlayedIndices.get(rrKey)! : -1;
      // Zero-allocation round-robin: pick random index from [0, numFiles-1] excluding lastIdx
      const availableCount = numFiles - (lastIdx >= 0 ? 1 : 0);
      let rawIdx = Math.floor(Math.random() * availableCount);
      if (lastIdx >= 0 && rawIdx >= lastIdx) rawIdx++;
      chosenIdx = rawIdx;
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

    // Voice Stealing (Choke Groups) in Eco Mode
    const isEco = typeof window !== 'undefined' && !!(window as any).oGiradorEcoMode;
    if (isEco) {
      const limit = this.getPolyphonyLimit(instrumentId);
      const voices = this.instrumentVoices.get(instrumentId) || [];
      while (voices.length >= limit) {
        const oldestVoice = voices.shift();
        if (oldestVoice) {
          const fadeOutTime = 0.01; // 10ms fade out
          try {
            const gainParam = oldestVoice.gainNode.gain;
            if (typeof gainParam.cancelAndHoldAtTime === 'function') {
              gainParam.cancelAndHoldAtTime(time);
            } else {
              gainParam.cancelScheduledValues(time);
              gainParam.setValueAtTime(gainParam.value, time);
            }
            gainParam.setTargetAtTime(0, time, fadeOutTime / 3);
            oldestVoice.source.stop(time + fadeOutTime);
          } catch (e) {
            try { oldestVoice.source.stop(); } catch (_) {}
          }
        }
      }
      this.instrumentVoices.set(instrumentId, voices);
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

    // 5. Utiliser un GainNode de la piscine
    const gainNode = this.getGainNode(instrumentId);
    gainNode.gain.cancelScheduledValues(time);
    gainNode.gain.setValueAtTime(velocity, time);

    source.connect(gainNode);


    // 6. Handle play duration and looping
    if (stroke.isBarulho) {
      source.loop = true;
      source.start(time);
      this.activeBarulhoNodes.set(instrumentId, source);
      this.activeBarulhoGains.set(instrumentId, gainNode);
      this.activeGainNodes.set(source, { instrumentId, gainNode });

      source.onended = () => {
        try { source.disconnect(); } catch (_) {}
        this.releaseGainNode(instrumentId, gainNode);
        this.activeGainNodes.delete(source);
        const currentVoices = this.instrumentVoices.get(instrumentId);
        if (currentVoices) {
          this.instrumentVoices.set(instrumentId, currentVoices.filter(v => v.source !== source));
        }
      };

      if (isEco) {
        const voices = this.instrumentVoices.get(instrumentId) || [];
        voices.push({ source, gainNode, time, velocity, instrumentId });
        this.instrumentVoices.set(instrumentId, voices);
      }
    } else {
      this.scheduledHits.add(source);
      this.activeGainNodes.set(source, { instrumentId, gainNode });
      const duration = buffer.duration * decayMultiplier;
      if (decayMultiplier < 1.0) {
        const fadeTime = Math.min(0.015, duration / 2);
        gainNode.gain.setValueAtTime(velocity, time + duration - fadeTime);
        gainNode.gain.linearRampToValueAtTime(0, time + duration);
        source.start(time, 0, duration);
      } else {
        source.start(time);
      }

      source.onended = () => {
        this.scheduledHits.delete(source);
        try { source.disconnect(); } catch (_) {}
        this.releaseGainNode(instrumentId, gainNode);
        this.activeGainNodes.delete(source);
        const currentVoices = this.instrumentVoices.get(instrumentId);
        if (currentVoices) {
          this.instrumentVoices.set(instrumentId, currentVoices.filter(v => v.source !== source));
        }
      };

      if (isEco) {
        const voices = this.instrumentVoices.get(instrumentId) || [];
        voices.push({ source, gainNode, time, velocity, instrumentId });
        this.instrumentVoices.set(instrumentId, voices);
      }
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
    const activeGain = this.activeBarulhoGains.get(instrumentId);
    
    if (activeNode && activeGain) {
      // Synchronously remove from instrumentVoices to prevent redundant voice stealing checks
      const currentVoices = this.instrumentVoices.get(instrumentId);
      if (currentVoices) {
        this.instrumentVoices.set(instrumentId, currentVoices.filter(v => v.source !== activeNode));
      }
      try {
        const fadeTime = 0.015; // 15ms fade out to avoid clicks
        activeGain.gain.setValueAtTime(activeGain.gain.value, time);
        activeGain.gain.linearRampToValueAtTime(0, time + fadeTime);
        
        activeNode.onended = null;
        activeNode.stop(time + fadeTime);
        
        const nodeToDisconnect = activeNode;
        const gainToRelease = activeGain;
        setTimeout(() => {
          try { nodeToDisconnect.disconnect(); } catch (_) {}
          this.releaseGainNode(instrumentId, gainToRelease);
          this.activeGainNodes.delete(nodeToDisconnect);
        }, (fadeTime * 1000) + 50);
      } catch (_) {
        // Fallback cleanup if node is already stopped/dead
        try { activeNode.disconnect(); } catch (_) {}
        this.releaseGainNode(instrumentId, activeGain);
        this.activeGainNodes.delete(activeNode);
      }
      this.activeBarulhoNodes.delete(instrumentId);
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

  /**
   * Cleans up all resources, stops the high-precision worker, and closes the AudioContext
   */
  public dispose(): void {
    this.stopAllBarulho();

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    if (this.clockNode) {
      try {
        this.clockNode.disconnect();
      } catch (_) {}
      this.clockNode = null;
    }
    
    if (this.fallbackTimerId) {
      window.clearInterval(this.fallbackTimerId);
      this.fallbackTimerId = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {
        console.warn("Failed to close AudioContext during dispose:", e);
      }
    }
    
    this.bufferPool.clear();
    this.activeBarulhoNodes.clear();
    this.activeBarulhoGains.clear();
    this.scheduledHits.clear();
    this.activeGainNodes.clear();
    this.gainNodePools.clear();
    this.instrumentVoices.clear();
  }
}
