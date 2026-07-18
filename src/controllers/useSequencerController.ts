import { useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { SampleManager } from '../audio/SampleManager';
import { useNewSequencerStore } from '../stores/useNewSequencerStore';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { playheadVanillaStore } from '../stores/usePlayheadStore';

interface VisualEvent {
  stepIndex: number;
  time: number;
}

const QUEUE_SIZE = 32;

export function useSequencerController() {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const trackGainsRef = useRef<Map<string, GainNode>>(new Map());

  // Mécanique Ring Buffer visuel
  const visualQueueRef = useRef<VisualEvent[]>([]);
  const writeIndexRef = useRef(0);
  const readIndexRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  // Micro-timing offsets pour chaque pas (extensibilité "balanço" / swing)
  const stepOffsetsRef = useRef<number[]>(new Array(16).fill(0));

  // Initialisation de la file d'attente
  if (visualQueueRef.current.length === 0) {
    visualQueueRef.current = Array.from({ length: QUEUE_SIZE }, () => ({ stepIndex: 0, time: 0 }));
  }

  useEffect(() => {
    // Initialise l'AudioEngine
    const engine = new AudioEngine();
    audioEngineRef.current = engine;

    // Récupération des valeurs initiales du store de configuration
    const initialSettings = useSequencerSettingsStore.getState();
    
    // Application initiale du tempo (tickDuration)
    const initialTickDuration = 15 / initialSettings.bpm;
    (engine as any).tickDuration = initialTickDuration;

    // Application initiale des offsets de Balanço (Swing)
    const applySwingOffsets = (balancoVal: number, tickDur: number) => {
      const intensity = balancoVal / 100;
      const maxOffset = tickDur * 0.30; // Max 30% de la durée du pas
      
      for (let i = 0; i < 16; i++) {
        const subIndex = i % 4;
        let offset = 0;
        if (subIndex === 1 || subIndex === 3) {
          offset = intensity * maxOffset; // Retarder les double-croches faibles
        } else if (subIndex === 2) {
          offset = intensity * maxOffset * 0.5; // Retarder légèrement le contretemps
        }
        stepOffsetsRef.current[i] = offset;
      }
    };
    applySwingOffsets(initialSettings.balanco, initialTickDuration);

    // Monkey-patching de la méthode scheduleNote privée pour intercepter les ticks de l'horloge
    (engine as any).scheduleNote = (tickCount: number, time: number) => {
      const stepIndex = tickCount % 16;
      
      // 1. Calcul du micro-timing (Swing / Balanço)
      const offset = stepOffsetsRef.current[stepIndex];
      const preciseTime = time + offset;

      // 2. Récupération non-réactive de l'état de la partition (Évite le Render Thrashing)
      const { trackIds, tracks, steps } = useNewSequencerStore.getState();
      const ctx = engine.getAudioContext();

      // 3. Planification audio avec GainNode et SampleManager
      trackIds.forEach((trackId) => {
        const track = tracks[trackId];
        const trackSteps = steps[trackId];

        if (track && trackSteps && trackSteps[stepIndex]) {
          let gainNode = trackGainsRef.current.get(trackId);
          if (!gainNode) {
            gainNode = ctx.createGain();
            gainNode.connect(ctx.destination);
            trackGainsRef.current.set(trackId, gainNode);
          }

          gainNode.gain.setValueAtTime(track.isMuted ? 0 : 1.0, preciseTime);

          const buffer = SampleManager.getInstance().getBuffer(track.name);
          if (buffer) {
            const sourceNode = ctx.createBufferSource();
            sourceNode.buffer = buffer;
            sourceNode.connect(gainNode);
            sourceNode.start(preciseTime);
          } else {
            console.warn(`Buffer not loaded yet for instrument: ${track.name}`);
          }
        }
      });

      // 4. Enregistrement dans le Ring Buffer (Zero-GC)
      const queue = visualQueueRef.current;
      const wIdx = writeIndexRef.current;
      queue[wIdx].stepIndex = stepIndex;
      queue[wIdx].time = preciseTime;
      writeIndexRef.current = (wIdx + 1) % QUEUE_SIZE;
    };

    // Boucle de rafraîchissement visuel à 60 FPS
    const updatePlayheadVisual = () => {
      const queue = visualQueueRef.current;
      const rIdx = readIndexRef.current;
      const wIdx = writeIndexRef.current;
      const now = engine.getAudioContext().currentTime;

      let currentRIdx = rIdx;
      while (currentRIdx !== wIdx) {
        const event = queue[currentRIdx];
        if (event.time > now) {
          break;
        }
        playheadVanillaStore.getState().setPlayhead(event.stepIndex);
        currentRIdx = (currentRIdx + 1) % QUEUE_SIZE;
      }
      readIndexRef.current = currentRIdx;
      rafIdRef.current = requestAnimationFrame(updatePlayheadVisual);
    };

    rafIdRef.current = requestAnimationFrame(updatePlayheadVisual);

    // Abonnement aux changements dynamiques de configuration (BPM & Balanço)
    const unsubscribeSettings = useSequencerSettingsStore.subscribe((state) => {
      const currentTickDuration = (engine as any).tickDuration;
      const newTickDuration = 15 / state.bpm;

      // 1. Ré-ancrage temporel dynamique en cas de modification du BPM
      if (currentTickDuration !== newTickDuration) {
        const nextTime = (engine as any).nextTickTime;
        (engine as any).anchorTime = nextTime;
        (engine as any).currentTickCount = 0;
        (engine as any).tickDuration = newTickDuration;
      }

      // 2. Recalcul des offsets temporels du Balanço
      applySwingOffsets(state.balanco, newTickDuration);
    });

    return () => {
      engine.stop();
      unsubscribeSettings();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      trackGainsRef.current.forEach((node) => {
        try {
          node.disconnect();
        } catch (_) {}
      });
      trackGainsRef.current.clear();
    };
  }, []);

  // Actions de contrôle publiques
  const start = async () => {
    if (audioEngineRef.current) {
      const ctx = audioEngineRef.current.getAudioContext();
      await SampleManager.getInstance().preload(ctx);
      await audioEngineRef.current.start();
      useNewSequencerStore.setState({ isPlaying: true });
    }
  };

  const stop = () => {
    if (audioEngineRef.current) {
      audioEngineRef.current.stop();
      useNewSequencerStore.setState({ isPlaying: false });
    }
  };

  const setSwingOffset = (stepIndex: number, offsetSeconds: number) => {
    if (stepIndex >= 0 && stepIndex < 16) {
      stepOffsetsRef.current[stepIndex] = offsetSeconds;
    }
  };

  return {
    start,
    stop,
    setSwingOffset,
  };
}
