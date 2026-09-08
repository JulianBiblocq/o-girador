/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Language } from '../../types';
import { extractBalancoOffsets, HitRecord } from '../../utils/grooveExtractor';
import { useSequencerStore } from '../../stores/useSequencerStore';

function scheduleBeep(
  ctx: AudioContext,
  timeSec: number,
  frequency: number,
  gainLevel = 0.4
): OscillatorNode {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, timeSec);

  // Enveloppe percussive ultra-rapide (40 ms) sans craquement
  gain.gain.setValueAtTime(gainLevel, timeSec);
  gain.gain.exponentialRampToValueAtTime(0.0001, timeSec + 0.045);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(timeSec);
  osc.stop(timeSec + 0.05);

  return osc;
}

// Flash d'impact matériel GPU via Web Animations API (Zero Render Thrashing)
function flashLed(el: HTMLElement | null, isAccent: boolean) {
  if (!el) return;
  try {
    el.animate(
      [
        {
          transform: isAccent ? 'scale(1.35)' : 'scale(1.2)',
          backgroundColor: isAccent ? '#22c55e' : '#eab308',
          boxShadow: isAccent ? '0 0 12px #22c55e' : '0 0 8px #eab308',
          opacity: 1
        },
        {
          transform: 'scale(1)',
          backgroundColor: '#3a2e22',
          boxShadow: 'none',
          opacity: 0.6
        }
      ],
      {
        duration: isAccent ? 220 : 160,
        easing: 'ease-out'
      }
    );
  } catch (_) {}
}

interface BalancoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureComplete: (offsets: [number, number, number, number]) => void;
  lang: Language;
}

export const BalancoCaptureModal: React.FC<BalancoCaptureModalProps> = ({
  isOpen,
  onClose,
  onCaptureComplete,
  lang
}) => {
  const initialBpm = useSequencerStore((state) => state.measureBpms[0] || 100);
  const [captureBpm, setCaptureBpm] = useState<number>(initialBpm);

  // Synchronise le BPM local à l'ouverture de la modale sans toucher au store global
  useEffect(() => {
    if (isOpen) {
      setCaptureBpm(initialBpm);
    }
  }, [isOpen, initialBpm]);

  const [cycleMeasures, setCycleMeasures] = useState<4 | 8>(4);
  const [phase, setPhase] = useState<'idle' | 'preroll' | 'recording' | 'done'>('idle');
  const [prerollCount, setPrerollCount] = useState<number>(1);
  const [hitCount, setHitCount] = useState<number>(0);

  const handleBpmChange = (delta: number) => {
    if (phase !== 'idle') return;
    setCaptureBpm((prev) => Math.max(40, Math.min(240, prev + delta)));
  };

  const handleBpmDirectInput = (val: number) => {
    if (phase !== 'idle') return;
    if (!isNaN(val)) {
      setCaptureBpm(Math.max(40, Math.min(240, val)));
    }
  };

  const phaseRef = useRef<'idle' | 'preroll' | 'recording' | 'done'>('idle');
  const hitsRef = useRef<HitRecord[]>([]);
  const timeoutIdsRef = useRef<number[]>([]);
  const activeOscsRef = useRef<OscillatorNode[]>([]);
  const padRef = useRef<HTMLButtonElement>(null);

  // Références et état pour le métronome visuel continu (GPU 60 FPS)
  const cursorRef = useRef<HTMLDivElement>(null);
  const railTrackRef = useRef<HTMLDivElement>(null);
  const leftLedRef = useRef<HTMLDivElement>(null);
  const rightLedRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const maxTravelPxRef = useRef<number>(300);
  const lastFlashedBeatRef = useRef<number>(-1);

  // Mesure de la largeur du rail (sans layout thrashing dans la boucle RAF)
  useEffect(() => {
    if (!isOpen) return;

    const updateWidth = () => {
      if (railTrackRef.current) {
        maxTravelPxRef.current = railTrackRef.current.clientWidth;
        if (phaseRef.current === 'idle' && cursorRef.current) {
          cursorRef.current.style.transform = `translate3d(${maxTravelPxRef.current * 0.5}px, 0, 0)`;
        }
      }
    };

    const tid = window.setTimeout(updateWidth, 50);
    window.addEventListener('resize', updateWidth);
    return () => {
      window.clearTimeout(tid);
      window.removeEventListener('resize', updateWidth);
    };
  }, [isOpen]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  // Enregistrement d'une frappe unifiée (Pad tactile, Clavier, MIDI) - Silencieux (sans monitoring)
  const registerHit = () => {
    // Effet visuel GPU immédiat sur le pad (sans repaint)
    if (padRef.current) {
      padRef.current.style.transform = 'scale(0.95)';
      padRef.current.style.backgroundColor = '#8b2a1a';
      padRef.current.style.color = '#f4ecd8';
      setTimeout(() => {
        if (padRef.current) {
          padRef.current.style.transform = '';
          padRef.current.style.backgroundColor = '';
          padRef.current.style.color = '';
        }
      }, 70);
    }

    if (phaseRef.current === 'recording') {
      try {
        const rawCtx = Tone.getContext().rawContext as AudioContext;
        hitsRef.current.push({ timeSec: rawCtx.currentTime });
        setHitCount(hitsRef.current.length);
      } catch (_) {}
    }
  };

  // 1. Écoute du clavier physique (F, J, Flèches) avec isolation stricte
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Garde-fou 1 : ignorer la répétition automatique des touches maintenues enfoncées
      if (e.repeat) return;

      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (
        e.code === 'KeyF' ||
        e.code === 'KeyJ' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight'
      ) {
        // Garde-fou 2 : isolation totale pour empêcher tout raccourci du séquenceur
        e.preventDefault();
        e.stopPropagation();
        registerHit();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen]);

  // 2. Écoute MIDI en direct
  useEffect(() => {
    if (!isOpen || typeof navigator === 'undefined' || !navigator.requestMIDIAccess) return;

    let midiAccessRef: MIDIAccess | null = null;

    const onMIDIMessage = (event: Event) => {
      const midiEvent = event as MIDIMessageEvent;
      if (!midiEvent.data) return;
      const [status, , velocity] = midiEvent.data;
      const isNoteOn = (status & 0xf0) === 0x90;
      if (isNoteOn && velocity > 0) {
        registerHit();
      }
    };

    navigator.requestMIDIAccess({ sysex: false }).then(
      (access) => {
        midiAccessRef = access;
        access.inputs.forEach((input) => {
          input.addEventListener('midimessage', onMIDIMessage);
        });
      },
      () => {
        // MIDI indisponible ou refusé
      }
    );

    return () => {
      if (midiAccessRef) {
        midiAccessRef.inputs.forEach((input) => {
          input.removeEventListener('midimessage', onMIDIMessage);
        });
      }
    };
  }, [isOpen]);

  // Nettoyage à la fermeture ou réinitialisation
  const stopAll = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    timeoutIdsRef.current = [];
    activeOscsRef.current.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (_) {}
    });
    activeOscsRef.current = [];
    phaseRef.current = 'idle';
    setPhase('idle');
    setHitCount(0);
    setPrerollCount(1);

    // Remettre le curseur au centre du rail
    if (cursorRef.current) {
      cursorRef.current.style.transform = `translate3d(${maxTravelPxRef.current * 0.5}px, 0, 0)`;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopAll();
    }
  }, [isOpen]);

  // Démarrage de la capture avec Pré-roll métronome précis et animation de balancier continue
  const startCapture = async () => {
    stopAll();
    hitsRef.current = [];
    setHitCount(0);

    const rawCtx = Tone.getContext().rawContext as AudioContext;
    if (rawCtx.state === 'suspended') {
      try {
        await rawCtx.resume();
      } catch (_) {}
    }

    const now = rawCtx.currentTime;
    const safeBpm = captureBpm > 0 ? captureBpm : 100;
    const beatSec = 60 / safeBpm;

    const t0 = now + 0.05; // 50ms de marge de sécurité scheduling
    const recStartTime = t0 + 4 * beatSec;
    const totalRecBeats = cycleMeasures * 4;
    const recEndTime = recStartTime + totalRecBeats * beatSec;

    // Cache la largeur du rail avant de démarrer l'animation
    if (railTrackRef.current) {
      maxTravelPxRef.current = railTrackRef.current.clientWidth;
    }

    // Décompte pré-roll (1 mesure = 4 temps montants : 600 -> 800 -> 1000 -> 1300 Hz)
    const prerollFreqs = [600, 800, 1000, 1300];
    for (let i = 0; i < 4; i++) {
      const clickTime = t0 + i * beatSec;
      const osc = scheduleBeep(rawCtx, clickTime, prerollFreqs[i], 0.4);
      activeOscsRef.current.push(osc);

      const delayMs = (clickTime - now) * 1000;
      const tid = window.setTimeout(() => {
        setPrerollCount(i + 1);
      }, Math.max(0, delayMs));
      timeoutIdsRef.current.push(tid);
    }

    phaseRef.current = 'preroll';
    setPrerollCount(1);
    setPhase('preroll');

    // Démarrage de la boucle d'animation continue (Balancier 60 FPS)
    startTimeRef.current = t0;
    lastFlashedBeatRef.current = -1;

    const animLoop = () => {
      const ctx = Tone.getContext().rawContext as AudioContext;
      const currentTime = ctx.currentTime;
      const elapsed = currentTime - startTimeRef.current;

      if (elapsed < 0) {
        // En attente du début effectif à t0
        if (cursorRef.current) {
          cursorRef.current.style.transform = 'translate3d(0px, 0, 0)';
        }
      } else {
        const currentBeatIndex = Math.floor(elapsed / beatSec);
        const beatProgress = (elapsed % beatSec) / beatSec;
        const smooth = 0.5 * (1 - Math.cos(Math.PI * beatProgress));
        const isEvenBeat = currentBeatIndex % 2 === 0;
        const pos = isEvenBeat ? smooth : 1 - smooth;

        if (cursorRef.current) {
          const posX = pos * maxTravelPxRef.current;
          cursorRef.current.style.transform = `translate3d(${posX}px, 0, 0)`;
        }

        // Contact aux extrémités et flash d'impact
        if (currentBeatIndex !== lastFlashedBeatRef.current) {
          lastFlashedBeatRef.current = currentBeatIndex;
          const isDownbeat = currentBeatIndex === 0 || (currentBeatIndex >= 4 && (currentBeatIndex - 4) % 4 === 0);
          if (isEvenBeat) {
            flashLed(leftLedRef.current, isDownbeat);
          } else {
            flashLed(rightLedRef.current, false);
          }
        }
      }

      if (phaseRef.current === 'preroll' || phaseRef.current === 'recording') {
        rafIdRef.current = requestAnimationFrame(animLoop);
      }
    };
    rafIdRef.current = requestAnimationFrame(animLoop);

    // Début d'enregistrement
    const recDelayMs = (recStartTime - now) * 1000;
    const tidRecStart = window.setTimeout(() => {
      phaseRef.current = 'recording';
      setPhase('recording');
    }, Math.max(0, recDelayMs));
    timeoutIdsRef.current.push(tidRecStart);

    // Métronome pendant les mesures d'enregistrement :
    // Temps 1 de chaque mesure : 1 200 Hz (gain 0.4)
    // Temps 2, 3, 4 de chaque mesure : 800 Hz (gain 0.25)
    for (let b = 0; b < totalRecBeats; b++) {
      const clickTime = recStartTime + b * beatSec;
      const isDownbeat = b % 4 === 0;
      const freq = isDownbeat ? 1200 : 800;
      const gain = isDownbeat ? 0.4 : 0.25;
      const osc = scheduleBeep(rawCtx, clickTime, freq, gain);
      activeOscsRef.current.push(osc);
    }

    // Fin d'enregistrement automatique
    const recEndDelayMs = (recEndTime - now) * 1000;
    const tidRecEnd = window.setTimeout(() => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      phaseRef.current = 'done';
      setPhase('done');
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${maxTravelPxRef.current * 0.5}px, 0, 0)`;
      }
      const calculatedOffsets = extractBalancoOffsets(hitsRef.current, safeBpm, recStartTime);
      onCaptureComplete(calculatedOffsets);
      onClose();
    }, Math.max(0, recEndDelayMs));
    timeoutIdsRef.current.push(tidRecEnd);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#f4ecd8] border-[3px] border-[#1a1a1a] p-6 max-w-md w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-5 text-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-2">
          <h3 className="font-cactus text-2xl font-bold flex items-center gap-2">
            🎙️ {lang === 'fr' ? 'Capture de Balanço' : 'Captura de Balanço'}
          </h3>
          <button
            onClick={onClose}
            className="text-xl font-bold hover:text-[#8b2a1a] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Configuration du cycle & Tempo */}
        <div className="flex items-center justify-between bg-[#eaddcf]/50 p-3 border border-black/15 rounded-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase">
              {lang === 'fr' ? 'Cycle :' : 'Ciclo :'}
            </span>
            <div className="flex gap-1">
              {([4, 8] as const).map((count) => (
                <button
                  key={count}
                  type="button"
                  disabled={phase !== 'idle'}
                  onClick={() => setCycleMeasures(count)}
                  className={`px-2.5 py-1 text-xs font-bold border border-black cursor-pointer shadow-[1px_1px_0px_#000] disabled:opacity-50 ${
                    cycleMeasures === count
                      ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                      : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  {count} {lang === 'fr' ? 'mes.' : 'comp.'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white px-2 py-1 border border-black shadow-[1px_1px_0px_#000]">
            <span>⏱️</span>
            <button
              type="button"
              disabled={phase !== 'idle'}
              onClick={() => handleBpmChange(-5)}
              className="w-6 h-6 flex items-center justify-center font-bold text-xs bg-[#eaddcf] border border-black hover:bg-black hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[0.5px_0.5px_0px_#000]"
              title="-5 BPM"
            >
              -5
            </button>
            <input
              type="number"
              min={40}
              max={240}
              disabled={phase !== 'idle'}
              value={captureBpm}
              onChange={(e) => handleBpmDirectInput(parseInt(e.target.value, 10))}
              className="w-12 text-center font-cactus text-sm font-bold bg-transparent border-b border-black/30 outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              disabled={phase !== 'idle'}
              onClick={() => handleBpmChange(5)}
              className="w-6 h-6 flex items-center justify-center font-bold text-xs bg-[#eaddcf] border border-black hover:bg-black hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[0.5px_0.5px_0px_#000]"
              title="+5 BPM"
            >
              +5
            </button>
            <span className="text-[10px] font-bold opacity-75">BPM</span>
          </div>
        </div>

        {/* Métronome Visuel Continu (Balancier Horizontal GPU 60 FPS) */}
        <div className="w-full bg-[#2a1d15] border-2 border-black shadow-[3px_3px_0px_#000] p-2 rounded-sm flex flex-col gap-1.5 text-[#f4ecd8]">
          <div className="flex justify-between items-center text-[10px] font-bold px-1 uppercase tracking-wider text-[#d5c3b0]">
            <div className="flex items-center gap-1.5">
              <span className="text-[#22c55e] font-black">● 1</span>
              <span className="opacity-50 text-[9px]">(3)</span>
            </div>
            <span className="font-cactus text-xs tracking-widest text-[#f4ecd8]/70">
              ⚡ BALANCIEZ AU TEMPO
            </span>
            <div className="flex items-center gap-1.5">
              <span className="opacity-50 text-[9px]">(4)</span>
              <span className="text-[#eab308] font-black">2 ●</span>
            </div>
          </div>

          <div className="relative w-full h-7 bg-[#1c130d] border border-black/60 rounded-sm flex items-center px-1">
            {/* Voyant d'impact Gauche (Temps 1 Accent & Temps 3) */}
            <div
              ref={leftLedRef}
              className="w-4 h-4 rounded-full border border-black/50 bg-[#3a2e22] opacity-60 flex items-center justify-center font-cactus text-[9px] font-black text-white shrink-0 z-10 select-none"
              title="Temps 1 (Accent) / Temps 3"
            >
              1
            </div>

            {/* Rail de guidage */}
            <div
              ref={railTrackRef}
              className="relative flex-1 h-full mx-1.5 flex items-center overflow-hidden"
            >
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#3a2e22] border-b border-white/5" />
              <div className="absolute left-1/2 top-1 bottom-1 w-[1px] bg-white/15 -translate-x-1/2" />
              <div className="absolute left-1/4 top-2 bottom-2 w-[1px] bg-white/10 -translate-x-1/2" />
              <div className="absolute left-3/4 top-2 bottom-2 w-[1px] bg-white/10 -translate-x-1/2" />

              {/* Curseur oscillant (barre vert émeraude percussive) */}
              <div
                ref={cursorRef}
                className="absolute top-0.5 bottom-0.5 w-1.5 bg-[#22c55e] shadow-[0_0_8px_#22c55e] rounded-full -translate-x-1/2 will-change-transform z-20 pointer-events-none"
              />
            </div>

            {/* Voyant d'impact Droite (Temps 2 & Temps 4) */}
            <div
              ref={rightLedRef}
              className="w-4 h-4 rounded-full border border-black/50 bg-[#3a2e22] opacity-60 flex items-center justify-center font-cactus text-[9px] font-black text-white shrink-0 z-10 select-none"
              title="Temps 2 / Temps 4"
            >
              2
            </div>
          </div>
        </div>

        {/* Zone Centrale : État ou Pad de frappe */}
        <div className="flex flex-col items-center gap-3">
          {phase === 'preroll' && (
            <div className="w-full h-36 flex flex-col items-center justify-center bg-[#8b2a1a] text-[#f4ecd8] border-2 border-black shadow-[4px_4px_0px_#000] rounded-sm animate-pulse">
              <span className="text-xs uppercase font-bold tracking-wider">
                {lang === 'fr' ? 'Écoutez le pré-roll...' : 'Ouça o pré-roll...'}
              </span>
              <span className="font-cactus text-6xl font-black">{prerollCount}</span>
            </div>
          )}

          {phase === 'recording' && (
            <div className="w-full flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#8b2a1a]">
                <span className="w-3 h-3 rounded-full bg-[#8b2a1a] animate-ping" />
                <span className="uppercase">
                  {lang === 'fr' ? 'Enregistrement en cours...' : 'Gravando...'} ({hitCount} {lang === 'fr' ? 'frappes' : 'toques'})
                </span>
              </div>

              {/* Pad tactile interactif */}
              <button
                ref={padRef}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  registerHit();
                }}
                className="w-full h-36 bg-[#f4ecd8] border-[3px] border-[#1a1a1a] shadow-[4px_4px_0px_#000] rounded-sm flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform duration-75 select-none"
              >
                <span className="text-3xl mb-1">🥁</span>
                <span className="font-cactus text-xl font-bold">
                  {lang === 'fr' ? 'FRAPPEZ ICI' : 'TOQUE AQUI'}
                </span>
                <span className="text-[10px] opacity-75 mt-1 font-mono">
                  Touches [F] / [J] ou Pad MIDI
                </span>
              </button>
            </div>
          )}

          {phase === 'idle' && (
            <div className="w-full flex flex-col items-center gap-4 py-2">
              <p className="text-xs text-center opacity-90">
                {lang === 'fr'
                  ? 'Jouez votre balanço en rythme au métronome. Le système calculera automatiquement la médiane des retards et avances sur les 4 doubles-croches.'
                  : 'Toque seu balanço no tempo do metrônomo. O sistema calculará automaticamente a mediana dos atrasos e avanços nas 4 semicolcheias.'}
              </p>

              <button
                type="button"
                onClick={startCapture}
                className="w-full py-3 bg-[#8b2a1a] text-[#f4ecd8] font-cactus text-lg font-bold border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-black hover:text-white transition-colors cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                ▶️ {lang === 'fr' ? "Démarrer l'enregistrement" : 'Iniciar Gravação'}
              </button>
            </div>
          )}
        </div>

        {/* Note d'avertissement matériel */}
        <div className="bg-[#eaddcf]/40 border border-black/15 p-2.5 rounded-sm text-[10px] leading-relaxed text-[#333]">
          ℹ️ {lang === 'fr'
            ? 'Clavier et écran tactile sont sujets à une latence matérielle (~15 ms). Pour une capture chirurgicale, privilégiez un pad ou clavier MIDI. Vous pourrez réajuster finement chaque pas au Nudge après enregistrement.'
            : 'Teclado e tela sensível ao toque sofrem com latência de hardware (~15 ms). Para captura cirúrgica, prefira um pad ou teclado MIDI. Você poderá ajustar finamente cada passo no Nudge após a gravação.'}
        </div>
      </div>
    </div>
  );
};
