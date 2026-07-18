export class SampleManager {
  private static instance: SampleManager | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private loadingPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): SampleManager {
    if (!SampleManager.instance) {
      SampleManager.instance = new SampleManager();
    }
    return SampleManager.instance;
  }

  /**
   * Précharge les échantillons par défaut dans le dictionnaire en mémoire (Offline-First)
   */
  public async preload(audioContext: AudioContext): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    const baseUrl = (import.meta as any).env.BASE_URL || '/';
    const sampleMapping: Record<string, string> = {
      alfaia: 'Mixdown/Alfaia meiao B.ogg',
      caixa: 'Mixdown/Caixa B.ogg',
      gongue: 'Mixdown/Gongue B.ogg',
      gonguê: 'Mixdown/Gongue B.ogg', // Robustesse accents
      agbe: 'Mixdown/Agbe B.ogg',
      agbê: 'Mixdown/Agbe B.ogg',     // Robustesse accents
      zabumba: 'Mixdown/Alfaia meiao B.ogg', // Fallback temporaire
      mineiro: 'Mixdown/Mineiro B.ogg',
      timbal: 'Mixdown/Timbal B.ogg',
    };

    const loadSample = async (key: string, path: string) => {
      try {
        const response = await fetch(`${baseUrl}${path}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        this.buffers.set(key, audioBuffer);
      } catch (error) {
        console.error(`Failed to load sample [${key}] from path [${path}]:`, error);
      }
    };

    const promises = Object.entries(sampleMapping).map(([key, path]) => loadSample(key, path));
    this.loadingPromise = Promise.all(promises).then(() => {});
    return this.loadingPromise;
  }

  /**
   * Récupère un buffer audio pré-chargé à partir de la clé (nom de l'instrument)
   */
  public getBuffer(key: string): AudioBuffer | undefined {
    // Normalise la clé pour supprimer les accents et passer en minuscules
    const normalizedKey = key.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    return this.buffers.get(normalizedKey) || this.buffers.get(key.toLowerCase());
  }

  /**
   * Vide la mémoire cache (prévention des fuites)
   */
  public clear(): void {
    this.buffers.clear();
    this.loadingPromise = null;
  }
}
