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

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();
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
    // Boucle de planification stricte sans allocation dynamique (Zero-GC)
    while (this.nextTickTime < this.audioContext.currentTime + this.SCHEDULE_AHEAD_TIME) {
      this.scheduleNote(this.currentTickCount, this.nextTickTime);
      this.currentTickCount++;
      // Calcul absolu de type "Zero-Drift" pour éliminer toute dérive cumulative de temps
      this.nextTickTime = this.anchorTime + (this.currentTickCount * this.tickDuration);
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
