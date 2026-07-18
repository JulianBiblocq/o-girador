export class AudioEngine {
  private audioContext: AudioContext;
  private isPlaying: boolean = false;
  private worker: Worker | null = null;
  private fallbackTimerId: number | null = null;

  private readonly LOOKAHEAD_INTERVAL = 25; // ms
  private readonly SCHEDULE_AHEAD_TIME = 0.100; // secondes

  private nextTickTime: number = 0;
  private currentTickCount: number = 0;
  private anchorTime: number = 0;
  private tickDuration: number = 0.125; // secondes (125 ms, équivaut à une double croche à 120 BPM)

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

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    try {
      this.audioContext = new AudioContextClass({ latencyHint: 'playback', sampleRate: 44100 });
    } catch (_) {
      this.audioContext = new AudioContextClass();
    }
    this.initWorkerClock();
  }

  private initWorkerClock(): void {
    try {
      const workerCode = "setInterval(() => postMessage('tick'), 25);";
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      this.worker = new Worker(workerUrl);
      // Sécurité mémoire : révocation immédiate de l'URL pour éviter toute fuite de mémoire
      URL.revokeObjectURL(workerUrl);

      this.worker.onmessage = (e: MessageEvent) => {
        if (e.data === 'tick' && this.isPlaying) {
          this.scheduler();
        }
      };
    } catch (error) {
      console.warn(
        "Web Worker clock initialization failed (likely blocked by Content Security Policy). Falling back to window.setInterval.",
        error
      );
      this.initFallbackTimer();
    }
  }

  private initFallbackTimer(): void {
    this.fallbackTimerId = window.setInterval(() => {
      if (this.isPlaying) {
        this.scheduler();
      }
    }, this.LOOKAHEAD_INTERVAL) as unknown as number;
  }

  private scheduler(): void {
    const currentTime = this.audioContext.currentTime;
    const lookaheadWindow = 0.025; // 25ms
    const safetyMargin = 0.010;    // 10ms

    // Resynchronisation matérielle de sécurité (lag massif / changement de rythme)
    if (this.nextTickTime < currentTime + lookaheadWindow) {
      this.nextTickTime = currentTime + lookaheadWindow + safetyMargin;
      this.mustReanchor = true;
    }

    // Boucle de planification stricte sans allocation dynamique (Zero-GC)
    while (this.nextTickTime < currentTime + this.SCHEDULE_AHEAD_TIME) {
      // 1. Exécution du callback / planification
      this.scheduleNote(this.currentTickCount, this.nextTickTime);
      
      // 2. Mise à jour des index de planification (16 pas par mesure pour ce moteur)
      this.schedulingStep = this.currentTickCount % 16;
      this.schedulingMeasure = Math.floor(this.currentTickCount / 16);

      // Diffusion pour l'UI
      this.currentStep = this.schedulingStep;
      this.currentMeasure = this.schedulingMeasure;

      // 3. Détection du début de mesure (Hard Sync) ou re-ancrage forcé de sécurité
      if (this.schedulingStep === 0 || this.schedulingMeasure !== this.lastSchedulingMeasure || this.mustReanchor) {
        this.anchorNoteTime = this.nextTickTime;
        this.anchorStep = this.currentTickCount;
        this.lastSchedulingMeasure = this.schedulingMeasure;
        this.mustReanchor = false; // Drapeau consommé
      }

      this.currentTickCount++;

      // 4. Calcul absolu du pas suivant sans accumulation (parfaitement aligné)
      this.nextTickTime = this.anchorNoteTime + ((this.currentTickCount - this.anchorStep) * this.tickDuration);
    }
  }

  private scheduleNote(tick: number, time: number): void {
    console.log("Scheduling tick", tick, "at", time);
  }

  public async start(): Promise<void> {
    if (this.isPlaying) {
      return;
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.anchorTime = this.audioContext.currentTime;
    this.nextTickTime = this.anchorTime;
    this.currentTickCount = 0;

    // Hard Sync initialization
    this.schedulingStep = this.currentStep;
    this.schedulingMeasure = this.currentMeasure;
    this.anchorNoteTime = this.nextTickTime;
    this.anchorStep = 0;
    this.lastSchedulingMeasure = -1; // Force re-anchor on first tick
    this.mustReanchor = false;

    this.isPlaying = true;
  }

  public stop(): void {
    this.isPlaying = false;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getAudioContext(): AudioContext {
    return this.audioContext;
  }
}
