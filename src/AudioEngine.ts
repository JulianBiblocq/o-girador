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
import { useSequencerStore } from './stores/useSequencerStore';
import { instrumentsConfig } from './data';
import { TrackGroup } from './types';

interface ActiveVoice {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  time: number;
  velocity: number;
  instrumentId: string;
}

export interface ActiveInstrumentData {
  id: string;
  activeStrokes: string[];
}

const HUMANIZED_INSTRUMENTS = new Set(['marcante', 'meiao', 'repique']);
const ALFAIA_INSTRUMENTS = new Set(['marcante', 'meiao', 'repique']);
const HUMANIZED_INSTRUMENTS_SET = new Set(['marcante', 'meiao', 'repique', 'caixa', 'tarol']);

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

  // Diffusion index (UI)
  public currentStep: number = 0;
  public currentMeasure: number = 0;

  // Internal scheduling indexes
  public schedulingStep: number = 0;
  public schedulingMeasure: number = 0;

  // Math Anchors for Measure Hard Sync
  private anchorNoteTime: number = 0.0;
  private anchorStep: number = 0;
  private lastSchedulingMeasure: number = -1;
  private mustReanchor: boolean = false;

  // Timer handlers
  private clockNode: AudioWorkletNode | null = null;
  private fallbackTimerId: number | null = null;

  // Callbacks
  private onTick: (time: number) => void;
  private getTickDuration: () => number;
  private getTicksPerMeasure: (measureIdx: number) => number;

  // Sampler State & Buffers
  private bufferPool = new Map<string, ToneType.ToneAudioBuffer>(); // Maps absolute path -> ToneAudioBuffer (Sample Pooling)
  private loadingPromises = new Map<string, Promise<void>>(); // Cache to prevent concurrent duplicate loading tasks
  private lastPlayedIndices = new Map<string, Map<string, number>>(); // Maps instrumentId -> strokeSymbol -> last played index (Round-Robin)
  private instrumentChannels = new Map<string, any>(); // Maps trackId -> Tone.Channel
  private defaultInstrumentChannels = new Map<string, any>(); // Maps instrumentId -> Tone.Channel
  private activeBarulhoNodes = new Map<string, AudioBufferSourceNode>(); // Maps instrumentId -> active looping BufferSource
  private activeBarulhoGains = new Map<string, GainNode>(); // Maps instrumentId -> GainNode of active Barulho
  private scheduledHits = new Set<AudioBufferSourceNode>();
  private activeGainNodes = new Map<AudioBufferSourceNode, { instrumentId: string; gainNode: GainNode; expectedEnd: number }>(); // Precise tracking to avoid leaks
  private gainNodePools = new Map<string, GainNode[]>(); // Maps instrumentId -> pooled GainNodes connected to channel
  private instrumentVoices = new Map<string, ActiveVoice[]>(); // Track active/scheduled voices for eco mode polyphony limits

  // O(1) lookup cache for instrument configurations (built once in constructor)
  private readonly configMap: Map<string, InstrumentAudioConfig>;

  // O(1) lookup map for strokes per instrument: maps instrumentId -> (normalizedSymbol -> StrokeMapping)
  private strokesMaps = new Map<string, Map<string, StrokeMapping>>();

  // O(1) lookup map for tracks: maps trackId (as string) -> TrackGroup
  private trackLookupMap = new Map<string, TrackGroup>();
  private lastTracksRef: TrackGroup[] | null = null;
  private unsubscribeTracks: (() => void) | null = null;

  private updateTrackLookupMap(tracks: TrackGroup[]): void {
    if (this.lastTracksRef === tracks) return;
    this.lastTracksRef = tracks;
    
    this.trackLookupMap.clear();
    const len = tracks.length;
    for (let i = 0; i < len; i++) {
      const track = tracks[i];
      this.trackLookupMap.set(String(track.id), track);
    }
  }

  // Pre-allocated object pools to avoid runtime dynamic allocations in the hot path
  private gainNodeMappingPool: { instrumentId: string; gainNode: GainNode | null; expectedEnd: number }[] = [];
  private gainNodeMappingPoolIndex = 0;
  private activeVoicePool: ActiveVoice[] = [];
  private activeVoicePoolIndex = 0;

  private getGainNodeMapping(instrumentId: string, gainNode: GainNode, expectedEnd: number): { instrumentId: string; gainNode: GainNode; expectedEnd: number } {
    const obj = this.gainNodeMappingPool[this.gainNodeMappingPoolIndex];
    this.gainNodeMappingPoolIndex = (this.gainNodeMappingPoolIndex + 1) % 512;
    obj.instrumentId = instrumentId;
    obj.gainNode = gainNode;
    obj.expectedEnd = expectedEnd;
    return obj as { instrumentId: string; gainNode: GainNode; expectedEnd: number };
  }

  private getActiveVoice(source: AudioBufferSourceNode, gainNode: GainNode, time: number, velocity: number, instrumentId: string): ActiveVoice {
    const obj = this.activeVoicePool[this.activeVoicePoolIndex];
    this.activeVoicePoolIndex = (this.activeVoicePoolIndex + 1) % 512;
    obj.source = source;
    obj.gainNode = gainNode;
    obj.time = time;
    obj.velocity = velocity;
    obj.instrumentId = instrumentId;
    return obj;
  }

  private removeActiveVoice(instrumentId: string, source: AudioBufferSourceNode): void {
    const currentVoices = this.instrumentVoices.get(instrumentId);
    if (currentVoices) {
      const len = currentVoices.length;
      for (let i = 0; i < len; i++) {
        if (currentVoices[i].source === source) {
          const voice = currentVoices[i];
          voice.source = null as any;
          voice.gainNode = null as any;
          voice.instrumentId = '';
          currentVoices.splice(i, 1);
          break;
        }
      }
    }
  }

  private handleVisibilityChange = () => {
    this.updateSchedulingParameters();
    
    if (typeof document !== 'undefined' && !document.hidden) {
      const now = this.audioContext.currentTime;
      const deadNodes: AudioBufferSourceNode[] = [];
      
      for (const [source, mapping] of this.activeGainNodes) {
        if (now > mapping.expectedEnd + 1.0) {
          deadNodes.push(source);
        }
      }
      
      const len = deadNodes.length;
      for (let i = 0; i < len; i++) {
        const source = deadNodes[i];
        const mapping = this.activeGainNodes.get(source);
        if (mapping) {
          try { source.disconnect(); } catch (_) {}
          
          const instrumentId = mapping.instrumentId;
          const gainNode = mapping.gainNode;
          
          if (gainNode) {
            this.releaseGainNode(instrumentId, gainNode);
            mapping.gainNode = null as any;
          }
          mapping.instrumentId = '';
          
          this.scheduledHits.delete(source);
          this.activeGainNodes.delete(source);
          
          if (instrumentId) {
            if (this.activeBarulhoNodes.get(instrumentId) === source) {
              this.activeBarulhoNodes.delete(instrumentId);
              this.activeBarulhoGains.delete(instrumentId);
            }
            this.removeActiveVoice(instrumentId, source);
          }
        }
      }
    }
  };

  /**
   * @param {AudioContext} audioContext - Native AudioContext to drive the clock and play samples
   * @param {Function} onTick - Callback fired when a tick is reached: (time: number) => void
   * @param {Function} getTickDuration - Callback returning the duration of a single tick in seconds
   * @param {Function} [getTicksPerMeasure] - Callback returning ticks count per measure
   */
  constructor(
    audioContext: AudioContext,
    onTick: (time: number) => void,
    getTickDuration: () => number,
    getTicksPerMeasure?: (measureIdx: number) => number
  ) {
    this.audioContext = audioContext;
    this.onTick = onTick;
    this.getTickDuration = getTickDuration;
    this.getTicksPerMeasure = getTicksPerMeasure || (() => 96);

    this.updateSchedulingParameters();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    // Pre-build O(1) config lookup map (avoids Array.find() on every note played)
    this.configMap = new Map(instrumentAudioConfigs.map(c => [c.id, c]));

    // Pre-build O(1) strokes maps (avoids config.strokes.find() in playNote())
    for (const config of instrumentAudioConfigs) {
      const map = new Map<string, StrokeMapping>();
      for (const stroke of config.strokes) {
        map.set(stroke.symbol, stroke);
        const upper = stroke.symbol.toUpperCase();
        if (!map.has(upper)) {
          map.set(upper, stroke);
        }
      }
      this.strokesMaps.set(config.id, map);
    }

    // Initialize trackLookupMap and subscribe to updates
    this.updateTrackLookupMap(useSequencerStore.getState().tracks);
    this.unsubscribeTracks = useSequencerStore.subscribe((state) => {
      this.updateTrackLookupMap(state.tracks);
    });

    // Pre-populate instrument voices map to avoid runtime array allocations
    instrumentAudioConfigs.forEach(config => {
      this.instrumentVoices.set(config.id, []);
    });

    // Pre-populate object pools to avoid runtime dynamic allocations in the hot path
    for (let i = 0; i < 512; i++) {
      this.gainNodeMappingPool.push({ instrumentId: '', gainNode: null, expectedEnd: 0 });
      this.activeVoicePool.push({
        source: null as any,
        gainNode: null as any,
        time: 0,
        velocity: 0,
        instrumentId: ''
      });
    }

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

    // Augmenter drastiquement l'anticipation pour les processeurs lents
    const baseAheadTime = isMobile ? 1.0 : 0.5; // 1 seconde d'avance sur mobile !
    this.SCHEDULE_AHEAD_TIME = Math.max(baseAheadTime, hwLatency + 0.150);

    // Augmenter légèrement l'intervalle de réveil pour économiser la batterie
    this.LOOKAHEAD_INTERVAL = isDesktopActive ? 25.0 : 50.0;

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
    
    // Hard Sync initialization
    this.schedulingStep = this.currentStep;
    this.schedulingMeasure = this.currentMeasure;
    this.anchorNoteTime = this.nextTickTime;
    this.anchorStep = this.schedulingStep;
    this.lastSchedulingMeasure = -1; // Force re-anchor on first tick
    this.mustReanchor = false;

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
    for (const [_, mapping] of this.activeGainNodes) {
      this.releaseGainNode(mapping.instrumentId, mapping.gainNode);
      mapping.gainNode = null as any;
      mapping.instrumentId = '';
    }
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
    const lookaheadWindow = 0.025; // 25ms de fenêtre minimale
    const safetyMargin = 0.010;    // 10ms de marge de sécurité

    // Resynchronisation matérielle de sécurité (lag massif / changement de rythme)
    if (this.nextTickTime < currentTime + lookaheadWindow) {
      this.nextTickTime = currentTime + lookaheadWindow + safetyMargin;
      this.mustReanchor = true;
    }

    // Schedule events in advance
    while (this.nextTickTime < currentTime + this.SCHEDULE_AHEAD_TIME) {
      // 1. Exécution du callback de planification (qui met à jour schedulingStep/Measure de façon synchrone)
      this.onTick(this.nextTickTime);

      const tickDuration = this.getTickDuration();

      // 2. Détection du début de mesure (Hard Sync) ou re-ancrage forcé de sécurité
      if (this.schedulingStep === 0 || this.schedulingMeasure !== this.lastSchedulingMeasure || this.mustReanchor) {
        this.anchorNoteTime = this.nextTickTime;
        this.anchorStep = this.schedulingStep;
        this.lastSchedulingMeasure = this.schedulingMeasure;
        this.mustReanchor = false; // Drapeau consommé
      }

      // 3. Calcul absolu du pas suivant sans accumulation (parfaitement aligné)
      this.nextTickTime = this.anchorNoteTime + ((this.schedulingStep + 1 - this.anchorStep) * tickDuration);
    }
  }

  /**
   * Preload all unique audio files mapped in instrumentAudioConfigs to memory.
   * Leverages caching to guarantee sample pooling (duplicate files are only loaded once).
   */
  private async loadPath(path: string): Promise<void> {
    if (this.bufferPool.has(path)) return;
    
    let promise = this.loadingPromises.get(path);
    if (!promise) {
      promise = (async () => {
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
        } finally {
          this.loadingPromises.delete(path);
        }
      })();
      this.loadingPromises.set(path, promise);
    }
    return promise;
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
  public async syncActiveInstrumentsMemory(activeInstruments: ActiveInstrumentData[]): Promise<void> {
    const requiredPaths = new Set<string>();

    for (const activeInst of activeInstruments) {
      const config = this.configMap.get(activeInst.id);
      if (config) {
        const activeStrokes = activeInst.activeStrokes;
        for (const stroke of config.strokes) {
          // Filtrage intelligent :
          // Si aucun stroke n'est programmé dans la partition pour cette piste (activeStrokes est vide),
          // on précharge par défaut le tout premier stroke configuré de l'instrument.
          // Sinon, on ne charge que les strokes présents dans activeStrokes.
          const isStrokeActive = activeStrokes.length === 0
            ? config.strokes[0] === stroke
            : activeStrokes.includes(stroke.symbol);

          if (isStrokeActive) {
            for (const file of stroke.files) {
              requiredPaths.add(file);
            }
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
  public setInstrumentChannel(trackId: number | string, instrumentId: string, channel: any): void {
    const normalizedId = String(trackId);
    this.instrumentChannels.set(normalizedId, channel);
    this.defaultInstrumentChannels.set(instrumentId, channel);
    
    if (!this.gainNodePools.has(instrumentId)) {
      const pool: GainNode[] = [];
      for (let i = 0; i < 15; i++) {
        const gainNode = this.audioContext.createGain();
        (gainNode as any)._isReleased = true;
        gainNode.gain.value = 0;
        pool.push(gainNode);
      }
      this.gainNodePools.set(instrumentId, pool);
    }
  }

  /**
   * Retourne la limite de polyphonie d'un instrument en mode éco.
   */
  private getPolyphonyLimit(instrumentId: string): number {
    const isEco = useSequencerStore.getState().isEcoMode;
    if (isEco) {
      switch (instrumentId) {
        case 'caixa':
        case 'tarol':
        case 'timbal':
        case 'agbe':
        case 'mineiro':
        case 'apito':
          return 1;
        default:
          return 2;
      }
    } else {
      switch (instrumentId) {
        case 'agbe':
        case 'mineiro':
          return 3; // Capped to 3 to prevent high-frequency overlap/phasing build-up
        case 'caixa':
        case 'tarol':
        case 'timbal':
        case 'apito':
          return 4;
        default:
          return 6;
      }
    }
  }

  private getGainNode(trackId: number | string | null, instrumentId: string): GainNode {
    const Tone = getTone();
    let gainNode: GainNode;

    const pool = this.gainNodePools.get(instrumentId);
    if (pool && pool.length > 0) {
      gainNode = pool.pop()!;
      (gainNode as any)._isReleased = false;
    } else {
      // Fallback dynamique
      gainNode = this.audioContext.createGain();
      (gainNode as any)._isReleased = false;
      gainNode.gain.value = 0;
    }

    // Connexion dynamique au canal propre à la piste trackId ou par défaut à l'instrumentId
    const channel = (trackId !== null && trackId !== undefined)
      ? this.instrumentChannels.get(String(trackId))
      : this.defaultInstrumentChannels.get(instrumentId);
      
    if (channel) {
      Tone.connect(gainNode, channel);
    } else {
      Tone.connect(gainNode, Tone.Destination);
    }

    return gainNode;
  }

  /**
   * Nettoie strictement le nœud de volume, le déconnecte et le rend à la piscine.
   */
  private releaseGainNode(instrumentId: string, gainNode: GainNode): void {
    if ((gainNode as any)._isReleased) return;
    (gainNode as any)._isReleased = true;

    const currentTime = this.audioContext.currentTime;
    try {
      gainNode.gain.cancelScheduledValues(currentTime);
      gainNode.gain.setValueAtTime(0, currentTime);
    } catch (_) {}
    
    // Déconnexion dynamique pour éviter les fuites stéréo et conflits
    try {
      gainNode.disconnect();
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
    trackIdOrInstrumentId: number | string,
    strokeSymbol: string,
    time: number,
    velocity: number,
    decayMultiplier: number
  ): void {
    let trackId: number | null = null;
    let instrumentId = '';
    
    // Find the track dynamically (handles string vs number IDs robustly)
    const track = this.trackLookupMap.get(String(trackIdOrInstrumentId));
    if (track) {
      trackId = track.id;
      instrumentId = instrumentsConfig[track.instrumentIdx].id;
    } else {
      instrumentId = String(trackIdOrInstrumentId);
    }

    // 1. Find the configuration for this instrument — O(1) Map lookup instead of O(n) Array.find()
    const config = this.configMap.get(instrumentId);
    if (!config) {
      console.warn(`AudioEngine: Unknown instrument ID: ${instrumentId}`);
      return;
    }

    let normSymbol = strokeSymbol;

    // Normalizations for legacy sequencer symbol compatibilities
    // Note: G→E normalization for Alfaias removed — symbols are now canonical and unambiguous.
    if (HUMANIZED_INSTRUMENTS_SET.has(instrumentId)) {
      if (normSymbol === 't' || normSymbol === 'T') normSymbol = 'B';
      else if (normSymbol === 'C') normSymbol = 'c';
    } else if (instrumentId === 'agbe') {
      if (normSymbol === 't') normSymbol = 'B';
    } else if (instrumentId === 'gongue') {
      if (normSymbol === 't') normSymbol = 'B';
    }

    // 2. Find the stroke mapping
    const strokesMap = this.strokesMaps.get(instrumentId);
    if (!strokesMap) {
      console.warn(`AudioEngine: No strokes map found for instrument: ${instrumentId}`);
      return;
    }

    let stroke = strokesMap.get(normSymbol);
    if (!stroke || stroke.files.length === 0) {
      // Fallback matching if symbol casing differs (for case-insensitive actions)
      stroke = strokesMap.get(normSymbol.toUpperCase());
      if (!stroke || stroke.files.length === 0) {
        console.warn(`AudioEngine: No stroke mapped for symbol "${strokeSymbol}" (normalized: "${normSymbol}") on instrument "${instrumentId}"`);
        return;
      }
    }

    this.playStroke(trackId, instrumentId, config, stroke, time, velocity, decayMultiplier);
  }

  /**
   * Helper to perform play and pitching of a specific stroke mapping
   */
  private playStroke(
    trackId: number | null,
    instrumentId: string,
    config: InstrumentAudioConfig,
    stroke: StrokeMapping,
    time: number,
    velocity: number,
    decayMultiplier: number
  ): void {
    const Tone = getTone();
    const isEco = useSequencerStore.getState().isEcoMode;

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
    const numFiles = stroke.files.length;
    let chosenIdx = 0;

    let instMap = this.lastPlayedIndices.get(instrumentId);
    if (!instMap) {
      instMap = new Map<string, number>();
      this.lastPlayedIndices.set(instrumentId, instMap);
    }

    if (numFiles > 1) {
      const lastIdx = instMap.has(stroke.symbol) ? instMap.get(stroke.symbol)! : -1;
      // Zero-allocation round-robin: pick random index from [0, numFiles-1] excluding lastIdx
      const availableCount = numFiles - (lastIdx >= 0 ? 1 : 0);
      let rawIdx = Math.floor(Math.random() * availableCount);
      if (lastIdx >= 0 && rawIdx >= lastIdx) rawIdx++;
      chosenIdx = rawIdx;
      instMap.set(stroke.symbol, chosenIdx);
    } else {
      instMap.set(stroke.symbol, 0);
    }

    const filePath = stroke.files[chosenIdx];
    const buffer = this.bufferPool.get(filePath);

    if (!buffer) {
      console.warn(`AudioEngine: Buffer not loaded for path: ${filePath}`);
      return;
    }

    // Voice Stealing (Choke Groups) - Always active for precise polyphony capping
    const isAlfaia = ALFAIA_INSTRUMENTS.has(instrumentId);
    if (isAlfaia) {
      // Zero-allocation voice stealing: count active Alfaia voices.
      let totalVoices = 0;
      for (const id of ALFAIA_INSTRUMENTS) {
        const voices = this.instrumentVoices.get(id);
        if (voices) {
          totalVoices += voices.length;
        }
      }

      if (totalVoices >= 3) {
        let oldestVoice: ActiveVoice | null = null;
        let oldestVoiceIdx = -1;
        let oldestVoiceInstrumentId = '';

        for (const id of ALFAIA_INSTRUMENTS) {
          const voices = this.instrumentVoices.get(id);
          if (voices) {
            const len = voices.length;
            for (let i = 0; i < len; i++) {
              const voice = voices[i];
              if (!oldestVoice || voice.time < oldestVoice.time) {
                oldestVoice = voice;
                oldestVoiceIdx = i;
                oldestVoiceInstrumentId = id;
              }
            }
          }
        }

        if (oldestVoice) {
          // Steal/stop the oldest voice
          try {
            const gainParam = oldestVoice.gainNode.gain;
            gainParam.cancelScheduledValues(time);
            gainParam.setValueAtTime(gainParam.value, time); // Anchoring current gain value to prevent clicks
            gainParam.linearRampToValueAtTime(0, time + 0.010); // 10ms linear ramp to 0
            oldestVoice.source.stop(time + 0.010);
          } catch (e) {
            try { oldestVoice.source.stop(time); } catch (_) {}
          }

          // Remove the stolen voice from its specific instrument's active voices list
          const origVoices = this.instrumentVoices.get(oldestVoiceInstrumentId);
          if (origVoices && oldestVoiceIdx !== -1) {
            origVoices.splice(oldestVoiceIdx, 1);
          }

          oldestVoice.source = null as any;
          oldestVoice.gainNode = null as any;
          oldestVoice.instrumentId = '';
        }
      }
    } else {
      // Standard Voice Stealing for non-Alfaia instruments
      const limit = this.getPolyphonyLimit(instrumentId);
      const voices = this.instrumentVoices.get(instrumentId) || [];
      while (voices.length >= limit) {
        const oldestVoice = voices.shift();
        if (oldestVoice) {
          const fadeOutTime = 0.012; // 12ms fade out
          try {
            const gainParam = oldestVoice.gainNode.gain;
            gainParam.cancelScheduledValues(time);
            gainParam.setValueAtTime(gainParam.value, time); // Anchoring current gain value to prevent clicks
            gainParam.linearRampToValueAtTime(0, time + fadeOutTime);
            oldestVoice.source.stop(time + fadeOutTime);
          } catch (e) {
            try { oldestVoice.source.stop(time); } catch (_) {}
          }
          oldestVoice.source = null as any;
          oldestVoice.gainNode = null as any;
          oldestVoice.instrumentId = '';
        }
      }
      this.instrumentVoices.set(instrumentId, voices);
    }

    // 3. Pitch Calculations (Macro & Micro/Humanization)
    let macroPitch = config.macroPitch !== undefined ? config.macroPitch : 1.0;
    
    // Organically vary the playback rate unless it is a Barulho or Gonguê
    let microPitch = 1.0;
    if (!stroke.isBarulho && instrumentId !== 'gongue') {
      if (HUMANIZED_INSTRUMENTS.has(instrumentId)) {
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
    const gainNode = this.getGainNode(trackId, instrumentId);
    gainNode.gain.cancelScheduledValues(time);
    gainNode.gain.setValueAtTime(velocity, time);

    source.connect(gainNode);

    // 6. Handle play duration and looping
    if (stroke.isBarulho) {
      source.loop = true;
      source.start(time);
      this.activeBarulhoNodes.set(instrumentId, source);
      this.activeBarulhoGains.set(instrumentId, gainNode);
      this.activeGainNodes.set(source, this.getGainNodeMapping(instrumentId, gainNode, Infinity));

      source.onended = () => {
        try { source.disconnect(); } catch (_) {}
        this.releaseGainNode(instrumentId, gainNode);
        const mapping = this.activeGainNodes.get(source);
        if (mapping) {
          mapping.gainNode = null as any;
          mapping.instrumentId = '';
        }
        this.activeGainNodes.delete(source);
        this.removeActiveVoice(instrumentId, source);
      };

      if (isEco) {
        const voices = this.instrumentVoices.get(instrumentId) || [];
        voices.push(this.getActiveVoice(source, gainNode, time, velocity, instrumentId));
        this.instrumentVoices.set(instrumentId, voices);
      }
    } else {
      this.scheduledHits.add(source);
      
      const originalBufferDuration = buffer.duration;
      // In Web Audio API, source.start(time, offset, duration) expects duration in buffer timeline seconds.
      const bufferPlayDuration = originalBufferDuration * decayMultiplier;
      // The real-world time duration is bufferPlayDuration / calculatedPitch.
      const realWorldDuration = bufferPlayDuration / calculatedPitch;
      const expectedEnd = time + realWorldDuration;
      
      this.activeGainNodes.set(source, this.getGainNodeMapping(instrumentId, gainNode, expectedEnd));

      // Apply linear fade-out to prevent clicks/aliasing transients at the end of playback
      const fadeTime = Math.min(0.015, realWorldDuration / 2);
      gainNode.gain.setValueAtTime(velocity, time);
      gainNode.gain.setValueAtTime(velocity, time + realWorldDuration - fadeTime);
      gainNode.gain.linearRampToValueAtTime(0, time + realWorldDuration);

      if (decayMultiplier < 1.0) {
        source.start(time, 0, bufferPlayDuration);
      } else {
        source.start(time);
      }

      source.onended = () => {
        this.scheduledHits.delete(source);
        try { source.disconnect(); } catch (_) {}
        this.releaseGainNode(instrumentId, gainNode);
        const mapping = this.activeGainNodes.get(source);
        if (mapping) {
          mapping.gainNode = null as any;
          mapping.instrumentId = '';
        }
        this.activeGainNodes.delete(source);
        this.removeActiveVoice(instrumentId, source);
      };

      // Track active voice for voice stealing
      const voices = this.instrumentVoices.get(instrumentId) || [];
      voices.push(this.getActiveVoice(source, gainNode, time, velocity, instrumentId));
      this.instrumentVoices.set(instrumentId, voices);
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
      this.removeActiveVoice(instrumentId, activeNode);
      try {
        const fadeTime = 0.015; // 15ms fade out to avoid clicks
        activeGain.gain.setValueAtTime(activeGain.gain.value, time);
        activeGain.gain.linearRampToValueAtTime(0, time + fadeTime);
        
        activeNode.stop(time + fadeTime);
      } catch (_) {
        // Fallback cleanup if node is already stopped/dead
        try { activeNode.disconnect(); } catch (_) {}
        this.releaseGainNode(instrumentId, activeGain);
        const mapping = this.activeGainNodes.get(activeNode);
        if (mapping) {
          mapping.gainNode = null as any;
          mapping.instrumentId = '';
        }
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

    if (this.unsubscribeTracks) {
      this.unsubscribeTracks();
      this.unsubscribeTracks = null;
    }

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    if (this.clockNode) {
      try {
        this.clockNode.port.onmessage = null;
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
    this.loadingPromises.clear();
    this.activeBarulhoNodes.clear();
    this.activeBarulhoGains.clear();
    this.scheduledHits.clear();
    for (const [_, mapping] of this.activeGainNodes) {
      mapping.gainNode = null as any;
      mapping.instrumentId = '';
    }
    this.activeGainNodes.clear();
    this.gainNodePools.clear();
    this.instrumentVoices.clear();
  }
}
