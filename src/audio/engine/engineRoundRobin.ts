/**
 * O Girador - Audio Engine Round-Robin Selection with Shared-Pool Anti-Collision
 */

import { StrokeMapping } from '../../data/audioConfig';

interface PoolTrigger {
  time: number;
  fileIdx: number;
}

export class EngineRoundRobin {
  public lastPlayedIndices = new Map<string, number>();
  public recentPoolTriggers = new Map<string, PoolTrigger[]>();

  public selectFile(
    instrumentId: string,
    stroke: StrokeMapping,
    time: number,
    trackId?: number | string | null
  ): string {
    const numFiles = stroke.files.length;
    if (numFiles <= 1) return stroke.files[0] || '';

    const samplePoolKey = stroke.files[0] || `${instrumentId}_${stroke.symbol}`;
    const trackKey = `${trackId ?? instrumentId}_${samplePoolKey}`;

    // 1. Nettoyage de l'historique glissant du pool (> 100ms)
    let triggers = this.recentPoolTriggers.get(samplePoolKey);
    if (!triggers) {
      triggers = [];
      this.recentPoolTriggers.set(samplePoolKey, triggers);
    } else {
      triggers = triggers.filter(e => Math.abs(time - e.time) <= 0.100);
      this.recentPoolTriggers.set(samplePoolKey, triggers);
    }

    // 2. Indices utilisés dans la fenêtre glissante acoustique de +- 30ms
    const usedIndices = new Set<number>();
    for (let i = 0; i < triggers.length; i++) {
      if (Math.abs(time - triggers[i].time) <= 0.030) {
        usedIndices.add(triggers[i].fileIdx);
      }
    }

    // 3. Mémoire du dernier index joué par cette piste sur ce pool (anti-mitraillette)
    const lastIdx = this.lastPlayedIndices.has(trackKey) ? this.lastPlayedIndices.get(trackKey)! : -1;

    // 4. Sélection des candidats
    // Priorité 1 : ni collision +- 30ms, ni répétition du dernier coup de la piste
    let candidates: number[] = [];
    for (let i = 0; i < numFiles; i++) {
      if (!usedIndices.has(i) && i !== lastIdx) {
        candidates.push(i);
      }
    }

    // Priorité 2 : privilégier l'anti-collision temporelle +- 30ms
    if (candidates.length === 0) {
      for (let i = 0; i < numFiles; i++) {
        if (!usedIndices.has(i)) candidates.push(i);
      }
    }

    // Priorité 3 : exclure le dernier coup de la piste
    if (candidates.length === 0) {
      for (let i = 0; i < numFiles; i++) {
        if (i !== lastIdx) candidates.push(i);
      }
    }

    // Priorité 4 : tous les fichiers disponibles
    if (candidates.length === 0) {
      for (let i = 0; i < numFiles; i++) candidates.push(i);
    }

    const randIdx = Math.floor(Math.random() * candidates.length);
    const chosenIdx = candidates[randIdx];

    // 5. Mémorisation
    triggers.push({ time, fileIdx: chosenIdx });
    this.lastPlayedIndices.set(trackKey, chosenIdx);

    if (this.lastPlayedIndices.size > 2000) this.lastPlayedIndices.clear();
    if (this.recentPoolTriggers.size > 500) this.recentPoolTriggers.clear();

    return stroke.files[chosenIdx];
  }

  public clear(): void {
    this.lastPlayedIndices.clear();
    this.recentPoolTriggers.clear();
  }
}
