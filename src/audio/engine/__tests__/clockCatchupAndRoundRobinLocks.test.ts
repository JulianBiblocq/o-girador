// @ts-ignore
import { describe, expect, it } from 'vitest';
import { packBarulhoOriginCoord } from '../../barulho/barulhoRampPlanner';
import { EngineBarulhoPlayer } from '../engineBarulhoPlayer';
import { EngineRoundRobin } from '../engineRoundRobin';
import { EngineSchedulerClock } from '../engineSchedulerClock';

describe('Volet 2 (Verrous C & D) & Volet 3 — Rattrapage Analytique < 2.5 s, Round-Robin Réversible & Legato Barulho Fallback', () => {
  it('Verrou C : conserve le tickTime analytique exact sans dérive après un gel Main Thread de 1.8 s (< 2.5 s) et ré-ancre au-delà de 6.0 s', () => {
    const mockCtx: any = { currentTime: 10.0 };
    const emittedTickTimes: number[] = [];
    const tickDur = 0.025; // 100 BPM (2.5 / 100)
    let purgedCount = 0;

    let clock!: EngineSchedulerClock;
    clock = new EngineSchedulerClock(mockCtx, {
      onTick: (t) => {
        emittedTickTimes.push(t);
        clock.schedulingStep++;
        if (clock.schedulingStep >= 96) {
          clock.schedulingStep = 0;
          clock.schedulingMeasure++;
        }
      },
      getTickDuration: () => tickDur,
      getTicksPerMeasure: () => 96,
      purgeScheduledHits: () => { purgedCount++; },
    });

    clock.start(10.0);
    const countAfterStart = emittedTickTimes.length;
    expect(countAfterStart).toBeGreaterThan(10);

    // Gel temporaire du Main Thread de 1.85 s (< 2.5 s)
    mockCtx.currentTime = 11.85;
    clock.scheduler();

    expect(purgedCount).toBe(0);
    expect(emittedTickTimes.length).toBeGreaterThan(75);
    for (let i = 0; i < emittedTickTimes.length; i++) {
      expect(emittedTickTimes[i]).toBeCloseTo(10.0 + i * tickDur, 10);
    }

    // Gel matériel profond (> 6.0 s) -> purge et ré-ancrage propre
    mockCtx.currentTime = 20.0;
    clock.scheduler();
    expect(purgedCount).toBe(1);
    clock.stop();
    clock.dispose();
  });

  it('Verrou D : EngineRoundRobin gère les escouades x1..x5, l exclusion +-30 ms (D/E & pistes sœurs), la saturation et purgeFromTime réversible', () => {
    const rr = new EngineRoundRobin();
    const sharedPoolFiles = ['alf1.ogg', 'alf2.ogg', 'alf3.ogg', 'alf4.ogg', 'alf5.ogg', 'alf6.ogg'];
    const strokeD = { symbol: 'D', keys: ['D'], caseSensitive: true, files: sharedPoolFiles };
    const strokeE = { symbol: 'E', keys: ['E'], caseSensitive: true, files: sharedPoolFiles };

    // 1. Escouade x5 : mémoire individuelle par musicien ${trackKey}__p${k} (0 répétition sur 30 pas)
    let prev5: number[] | null = null;
    for (let s = 0; s < 30; s++) {
      const cur5 = rr.selectSquadFileIndices('marcante', strokeD, s * 0.20, 5, 101);
      expect(cur5).toHaveLength(5);
      expect(new Set(cur5).size).toBe(5);
      if (prev5) {
        for (let k = 0; k < 5; k++) expect(cur5[k]).not.toBe(prev5[k]);
      }
      prev5 = cur5;
    }

    // 2. Fenêtre glissante +-30 ms sur samplePoolKey commun entre D et E (et entre Marcante/Meião/Repique partageant un pool)
    rr.clear();
    const hitD = rr.selectSquadFileIndices('marcante', strokeD, 5.000, 2, 101);
    const hitE = rr.selectSquadFileIndices('marcante', strokeE, 5.018, 2, 101); // +18 ms <= 30 ms sur même piste D -> E
    const hitSister = rr.selectSquadFileIndices('meiao', strokeD, 5.025, 2, 102); // +25 ms <= 30 ms sur piste sœur
    expect(new Set([...hitD, ...hitE, ...hitSister]).size).toBe(6);

    // 3. Repli déterministe sûr en cas de saturation du pool (> 6 joueurs simultanés sur 6 fichiers)
    const saturated = rr.selectSquadFileIndices('repique', strokeD, 5.028, 3, 103);
    expect(saturated).toHaveLength(3);
    saturated.forEach((idx) => {
      expect(Number.isInteger(idx)).toBe(true);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(sharedPoolFiles.length);
    });

    // 4. Réversibilité stricte de purgeFromTime(fromTimeSec) : restaure lastFileByPlayerKey au dernier coup < fromTimeSec
    rr.clear();
    const smallStroke = { symbol: 'D', keys: ['D'], caseSensitive: true, files: ['s0.ogg', 's1.ogg'] };
    const idxAt1s = rr.selectFileIndex('caixa', smallStroke, 1.0, 200);
    const idxAt2s = rr.selectFileIndex('caixa', smallStroke, 2.0, 200);
    expect(idxAt2s).not.toBe(idxAt1s);

    // On purge à partir de 1.5 s (le coup à 2.0 s est annulé par rebuild d'horizon)
    rr.purgeFromTime(1.5);
    const rebuiltAt1_6s = rr.selectFileIndex('caixa', smallStroke, 1.6, 200);
    expect(rebuiltAt1_6s).not.toBe(idxAt1s);
  });

  it('Volet 3 & Micro-Verrou 3 : maintient le legato B -> B inter-mesures en Fallback Web Audio et coupe immédiatement sur Stop/Mute', () => {
    const barulho = new EngineBarulhoPlayer();
    let stoppedAt = -1;
    let rampedTarget = -1;
    const mockNode: any = { stop: (t: number) => { stoppedAt = t; }, disconnect: () => {} };
    const mockGain: any = {
      gain: {
        value: 0.7,
        cancelScheduledValues: () => {},
        setValueAtTime: () => {},
        linearRampToValueAtTime: (v: number) => { rampedTarget = v; },
      },
    };
    barulho.init({ currentTime: 1.0 } as any, { releaseGainNode: () => {} } as any, { removeActiveVoice: () => {} } as any, new Map());

    const coordM0Step0 = packBarulhoOriginCoord(0, 0, false);
    const coordM1Step0 = packBarulhoOriginCoord(1, 0, false);
    const coordM1Step4 = packBarulhoOriginCoord(1, 4, false);

    barulho.activeBarulhoNodes.set('marcante', mockNode);
    barulho.activeBarulhoGains.set('marcante', mockGain);
    barulho.activeBarulhoCoords.set('marcante', coordM0Step0);

    // Même pas (step 0) à la mesure suivante (M1) -> maintien legato sans ré-impact
    expect(barulho.trySustainLegatoBarulho('marcante', coordM1Step0, 0.85, 2.4, false)).toBe(true);
    expect(rampedTarget).toBeCloseTo(0.85, 5);
    expect(barulho.activeBarulhoCoords.get('marcante')).toBe(coordM1Step0);

    // Pas différent (step 4) -> refuse le legato pour permettre le choke 20 ms + ré-attaque
    expect(barulho.trySustainLegatoBarulho('marcante', coordM1Step4, 0.9, 3.0, false)).toBe(false);

    // Extinction immédiate sur Mute / Pause / Stop (zéro boucle fantôme)
    barulho.stopBarulho('marcante', 3.5);
    expect(stoppedAt).toBeGreaterThan(3.5);
    expect(barulho.activeBarulhoNodes.has('marcante')).toBe(false);
    expect(barulho.activeBarulhoCoords.has('marcante')).toBe(false);
  });
});
