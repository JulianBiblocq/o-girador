/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudio } from '../contexts/AudioContext';
import { useSequencer } from '../contexts/SequencerContext';
import { i18n } from '../data';
import { SpeedTrainerConfig } from '../types/speedTrainer.types';
import { X, Minus, Plus, Square, Info } from 'lucide-react';
import { XiloLightning } from './XiloIcons';

interface HoldButtonProps {
  onAction: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  title?: string;
}

const HoldButton: React.FC<HoldButtonProps> = ({
  onAction,
  disabled = false,
  className = '',
  children,
  title,
}) => {
  const actionRef = useRef(onAction);
  actionRef.current = onAction;

  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || disabledRef.current) return;
    e.preventDefault();
    stop();

    // First increment immediately
    actionRef.current();

    let count = 0;
    timerRef.current = window.setTimeout(() => {
      const runInterval = () => {
        if (disabledRef.current) {
          stop();
          return;
        }
        count++;
        actionRef.current();
        // Progressively accelerate hold speed: 130ms -> 75ms -> 40ms
        const nextSpeed = count > 12 ? 40 : count > 5 ? 75 : 130;
        intervalRef.current = window.setTimeout(runInterval, nextSpeed);
      };
      runInterval();
    }, 320);
  }, [stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (!disabled) actionRef.current();
        }
      }}
      style={{ touchAction: 'none' }}
      className={className}
    >
      {children}
    </button>
  );
};

interface NumberInputProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  className?: string;
  ariaLabel?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  min,
  max,
  onChange,
  className = '',
  ariaLabel,
}) => {
  const [text, setText] = useState<string>(String(value));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setText(String(value));
    }
  }, [value]);

  const commit = (str: string) => {
    const parsed = parseInt(str, 10);
    if (isNaN(parsed)) {
      setText(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    setText(String(clamped));
    onChange(clamped);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={ariaLabel}
      value={text}
      onFocus={(e) => {
        isFocusedRef.current = true;
        e.target.select();
      }}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/[^0-9]/g, '');
        setText(cleaned);
      }}
      onBlur={(e) => {
        isFocusedRef.current = false;
        commit(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const current = parseInt(text, 10) || value;
          commit(String(current + 1));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const current = parseInt(text, 10) || value;
          commit(String(current - 1));
        }
      }}
      className={className}
    />
  );
};

export const SpeedTrainerModal: React.FC = () => {
  const audio = useAudio();
  const sequencer = useSequencer();
  const lang = sequencer.lang || 'pt';
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const isOpen = useSequencerStore((state) => state.isSpeedTrainerOpen);
  const isActive = useSequencerStore((state) => state.isSpeedTrainerActive);
  const storeConfig = useSequencerStore((state) => state.speedTrainerConfig);
  const totalMeasures = useSequencerStore((state) => state.totalMeasures || 1);
  const songMarkers = useSequencerStore(useShallow((state) => state.songMarkers || []));
  const songBpm = useSequencerStore((state) => state.bpm || 83);
  const currentTour = useSequencerStore((state) => state.speedTrainerTourCount || 0);
  const currentBpm = useSequencerStore((state) => state.speedTrainerCurrentBpm || songBpm);
  const closeSpeedTrainerModal = useSequencerStore((state) => state.closeSpeedTrainerModal);

  // Markers sorted chronologically
  const sortedMarkers = useMemo(() => {
    return [...songMarkers].sort((a, b) => a.measure - b.measure);
  }, [songMarkers]);

  // Marker selection state
  const [markerMode, setMarkerMode] = useState<'single' | 'range'>('single');
  const [selectedSectionMarkerId, setSelectedSectionMarkerId] = useState<string>('');
  const [rangeStartMarkerId, setRangeStartMarkerId] = useState<string>('');
  const [rangeEndMarkerId, setRangeEndMarkerId] = useState<string>('');

  // Local form state
  const [startMeasure, setStartMeasure] = useState<number>(0);
  const [endMeasure, setEndMeasure] = useState<number>(1);
  const [startBpm, setStartBpm] = useState<number>(63);
  const [targetBpm, setTargetBpm] = useState<number>(songBpm);
  const [bpmStep, setBpmStep] = useState<number>(2);
  const [loopInterval, setLoopInterval] = useState<number>(1);

  // Marker selection handlers
  const handleSelectSingleMarker = (markerId: string) => {
    setSelectedSectionMarkerId(markerId);
    if (!markerId) return;
    const idx = sortedMarkers.findIndex((m) => m.id === markerId);
    if (idx === -1) return;
    const marker = sortedMarkers[idx];
    const nextMarker = sortedMarkers[idx + 1];
    const start = Math.min(totalMeasures - 1, Math.max(0, marker.measure));
    const end = nextMarker
      ? Math.min(totalMeasures - 1, Math.max(start, nextMarker.measure - 1))
      : totalMeasures - 1;
    setStartMeasure(start);
    setEndMeasure(end);
  };

  const handleSelectRangeStart = (startId: string) => {
    setRangeStartMarkerId(startId);
    if (!startId) return;
    const markerA = sortedMarkers.find((m) => m.id === startId);
    if (!markerA) return;
    const start = Math.min(totalMeasures - 1, Math.max(0, markerA.measure));
    setStartMeasure(start);
    // Interval safety: force endMeasure >= startMeasure
    if (start > endMeasure) {
      setEndMeasure(start);
    }
  };

  const handleSelectRangeEnd = (endId: string) => {
    setRangeEndMarkerId(endId);
    if (!endId) return;
    const idx = sortedMarkers.findIndex((m) => m.id === endId);
    if (idx === -1) return;
    const markerB = sortedMarkers[idx];
    const nextMarker = sortedMarkers[idx + 1];
    const end = nextMarker
      ? Math.min(totalMeasures - 1, Math.max(markerB.measure, nextMarker.measure - 1))
      : totalMeasures - 1;
    setEndMeasure(end);
    // Interval safety: force endMeasure >= startMeasure
    if (end < startMeasure) {
      setStartMeasure(markerB.measure);
      setRangeStartMarkerId(endId);
    }
  };

  // Sync state when opening
  useEffect(() => {
    if (isOpen) {
      const initialTarget = songBpm;
      const initialStart = Math.max(40, initialTarget - 20);

      const sM = storeConfig ? storeConfig.startMeasure : 0;
      const eM = storeConfig ? storeConfig.endMeasure : Math.min(1, totalMeasures - 1);

      setStartMeasure(Math.min(sM, totalMeasures - 1));
      setEndMeasure(Math.min(Math.max(sM, eM), totalMeasures - 1));
      setStartBpm(storeConfig ? storeConfig.startBpm : initialStart);
      setTargetBpm(storeConfig ? storeConfig.targetBpm : initialTarget);
      setBpmStep(storeConfig?.bpmStep || 2);
      setLoopInterval(storeConfig?.loopInterval || 1);
      setSelectedSectionMarkerId('');
      setRangeStartMarkerId('');
      setRangeEndMarkerId('');
    }
  }, [isOpen, storeConfig, songBpm, totalMeasures]);

  const handleClose = useCallback(() => {
    useSequencerStore.getState().setSpeedTrainerConfig({
      startMeasure,
      endMeasure,
      startBpm: Math.min(startBpm, targetBpm),
      targetBpm,
      bpmStep,
      loopInterval,
    });
    closeSpeedTrainerModal();
  }, [startMeasure, endMeasure, startBpm, targetBpm, bpmStep, loopInterval, closeSpeedTrainerModal]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleLaunch = () => {
    const config: SpeedTrainerConfig = {
      startMeasure,
      endMeasure,
      startBpm: Math.min(startBpm, targetBpm),
      targetBpm,
      bpmStep,
      loopInterval,
    };
    handleClose();
    audio.launchSpeedTrainer(config);
  };

  const handleStopAndRestore = () => {
    handleClose();
    audio.stopSpeedTrainerAudio();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 select-none">
      <div 
        className="w-full max-w-[480px] bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[6px_6px_0px_#1a1a1a] flex flex-col overflow-hidden text-[#1a1a1a] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-3 sm:p-4 bg-[#ebe2cb] border-b-2 border-[#1a1a1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xs bg-amber-500/20 border border-amber-600 flex items-center justify-center text-amber-700 shadow-[1px_1px_0px_#1a1a1a]">
              <XiloLightning size={16} />
            </span>
            <div>
              <h2 className="font-cactus font-bold text-lg sm:text-xl uppercase tracking-wide leading-none">
                {t('speedTrainerTitle')}
              </h2>
              <span className="text-[10px] text-[#555] font-sans font-bold">
                {t('speedTrainerSubtitle')}
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center border-2 border-[#1a1a1a] rounded-xs bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] font-bold text-base transition-colors shadow-[2px_2px_0px_#1a1a1a] cursor-pointer"
            title={lang === 'fr' ? 'Fermer (Échap)' : 'Fechar (Esc)'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Active Banner if already running */}
        {isActive && (
          <div className="bg-amber-500/15 border-b-2 border-amber-600/50 p-2.5 px-4 flex items-center justify-between text-xs font-bold text-amber-900">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
              </span>
              <span>
                {t('speedTrainerActiveBanner')} : {t('speedTrainerTour')} {currentTour + 1}
              </span>
            </div>
            <span className="font-cactus text-sm">
              {currentBpm} / {targetBpm} BPM
            </span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
          {/* Pedagogical Help Box */}
          <div className="p-2.5 bg-[#ebe2cb]/70 border border-[#1a1a1a]/40 rounded-xs flex items-start gap-2 text-[11px] text-[#333] leading-relaxed">
            <Info className="w-4 h-4 text-[#8b2a1a] shrink-0 mt-0.5" />
            <p>{t('speedTrainerHelp')}</p>
          </div>

          {/* 1. Zone de travail (Mesures) */}
          <div className="flex flex-col gap-2">
            <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
              📍 {t('speedTrainerZone')}
            </label>

            {/* Repères / Sections si disponibles */}
            {sortedMarkers.length > 0 && (
              <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2.5 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[#666] font-bold uppercase flex items-center gap-1">
                    🏷️ {t('speedTrainerMarkersTitle')}
                  </span>
                  {sortedMarkers.length > 1 && (
                    <div className="flex border border-[#1a1a1a] rounded-xs bg-[#ebe2cb] p-0.5 text-[10px] font-cactus">
                      <button
                        type="button"
                        onClick={() => setMarkerMode('single')}
                        className={`px-2 py-0.5 rounded-xs font-bold transition-all cursor-pointer ${
                          markerMode === 'single'
                            ? 'bg-[#1a1a1a] text-[#f4ecd8] shadow-[1px_1px_0px_#1a1a1a]'
                            : 'text-[#1a1a1a] hover:bg-black/5'
                        }`}
                      >
                        {t('speedTrainerSingleMarker')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarkerMode('range')}
                        className={`px-2 py-0.5 rounded-xs font-bold transition-all cursor-pointer ${
                          markerMode === 'range'
                            ? 'bg-[#1a1a1a] text-[#f4ecd8] shadow-[1px_1px_0px_#1a1a1a]'
                            : 'text-[#1a1a1a] hover:bg-black/5'
                        }`}
                      >
                        {t('speedTrainerRangeMarker')}
                      </button>
                    </div>
                  )}
                </div>

                {markerMode === 'single' ? (
                  <div className="flex flex-col gap-1">
                    <select
                      value={selectedSectionMarkerId}
                      onChange={(e) => handleSelectSingleMarker(e.target.value)}
                      className="w-full bg-[#f4ecd8] border-2 border-[#1a1a1a] py-1.5 px-2 rounded-xs text-xs font-bold text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                    >
                      <option value="">{t('speedTrainerSelectSection')}</option>
                      {sortedMarkers.map((m, idx) => {
                        const nextM = sortedMarkers[idx + 1];
                        const endM = nextM ? Math.max(m.measure, nextM.measure - 1) : totalMeasures - 1;
                        const mStart = m.measure + 1;
                        const mEnd = endM + 1;
                        const rangeLabel = mStart === mEnd ? `m. ${mStart}` : `m. ${mStart} - ${mEnd}`;
                        const cleanName = m.name.replace(/\n/g, ' ').trim() || `${t('speedTrainerSingleMarker')} ${mStart}`;
                        return (
                          <option key={m.id} value={m.id}>
                            📍 {cleanName} ({rangeLabel})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-[#666] font-bold uppercase">
                        {t('speedTrainerFromMarker')}
                      </span>
                      <select
                        value={rangeStartMarkerId}
                        onChange={(e) => handleSelectRangeStart(e.target.value)}
                        className="w-full bg-[#f4ecd8] border-2 border-[#1a1a1a] py-1.5 px-2 rounded-xs text-xs font-bold text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                      >
                        <option value="">{t('speedTrainerMarkerStartPlaceholder')}</option>
                        {sortedMarkers.map((m) => {
                          const mStart = m.measure + 1;
                          const cleanName = m.name.replace(/\n/g, ' ').trim() || `${t('speedTrainerSingleMarker')} ${mStart}`;
                          return (
                            <option key={m.id} value={m.id}>
                              {cleanName} (m. ${mStart})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-[#666] font-bold uppercase">
                        {t('speedTrainerToMarker')}
                      </span>
                      <select
                        value={rangeEndMarkerId}
                        onChange={(e) => handleSelectRangeEnd(e.target.value)}
                        className="w-full bg-[#f4ecd8] border-2 border-[#1a1a1a] py-1.5 px-2 rounded-xs text-xs font-bold text-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                      >
                        <option value="">{t('speedTrainerMarkerEndPlaceholder')}</option>
                        {sortedMarkers.map((m, idx) => {
                          const nextM = sortedMarkers[idx + 1];
                          const endM = nextM ? Math.max(m.measure, nextM.measure - 1) : totalMeasures - 1;
                          const mStart = m.measure + 1;
                          const mEnd = endM + 1;
                          const rangeLabel = mStart === mEnd ? `m. ${mStart}` : `m. ${mStart} - ${mEnd}`;
                          const cleanName = m.name.replace(/\n/g, ' ').trim() || `${t('speedTrainerSingleMarker')} ${mStart}`;
                          return (
                            <option key={m.id} value={m.id}>
                              {cleanName} ({rangeLabel})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {/* Start Measure */}
              <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex flex-col gap-1">
                <span className="text-[10px] text-[#666] font-bold uppercase">
                  {t('speedTrainerFrom')}
                </span>
                <div className="flex items-center justify-between">
                  <HoldButton
                    onAction={() => {
                      setStartMeasure(prev => Math.max(0, prev - 1));
                      setSelectedSectionMarkerId('');
                    }}
                    disabled={startMeasure <= 0}
                    className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </HoldButton>
                  <NumberInput
                    value={startMeasure + 1}
                    min={1}
                    max={totalMeasures}
                    ariaLabel={t('speedTrainerFrom')}
                    onChange={(val) => {
                      const newStart = val - 1;
                      setStartMeasure(newStart);
                      setSelectedSectionMarkerId('');
                      if (newStart > endMeasure) {
                        setEndMeasure(newStart);
                      }
                    }}
                    className="w-14 text-center font-cactus font-bold text-xl tabular-nums bg-transparent border-b border-transparent focus:border-[#1a1a1a] focus:bg-white/80 focus:outline-none rounded-xs py-0.5 transition-colors"
                  />
                  <HoldButton
                    onAction={() => {
                      setStartMeasure(prev => {
                        const next = Math.min(totalMeasures - 1, prev + 1);
                        if (next > endMeasure) {
                          setEndMeasure(next);
                        }
                        return next;
                      });
                      setSelectedSectionMarkerId('');
                    }}
                    disabled={startMeasure >= totalMeasures - 1}
                    className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </HoldButton>
                </div>
              </div>

              {/* End Measure */}
              <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex flex-col gap-1">
                <span className="text-[10px] text-[#666] font-bold uppercase">
                  {t('speedTrainerTo')}
                </span>
                <div className="flex items-center justify-between">
                  <HoldButton
                    onAction={() => {
                      setEndMeasure(prev => {
                        const next = Math.max(0, prev - 1);
                        if (next < startMeasure) {
                          setStartMeasure(next);
                        }
                        return next;
                      });
                      setSelectedSectionMarkerId('');
                    }}
                    disabled={endMeasure <= 0}
                    className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </HoldButton>
                  <NumberInput
                    value={endMeasure + 1}
                    min={1}
                    max={totalMeasures}
                    ariaLabel={t('speedTrainerTo')}
                    onChange={(val) => {
                      const newEnd = val - 1;
                      setEndMeasure(newEnd);
                      setSelectedSectionMarkerId('');
                      if (newEnd < startMeasure) {
                        setStartMeasure(newEnd);
                      }
                    }}
                    className="w-14 text-center font-cactus font-bold text-xl tabular-nums bg-transparent border-b border-transparent focus:border-[#1a1a1a] focus:bg-white/80 focus:outline-none rounded-xs py-0.5 transition-colors"
                  />
                  <HoldButton
                    onAction={() => {
                      setEndMeasure(prev => Math.min(totalMeasures - 1, prev + 1));
                      setSelectedSectionMarkerId('');
                    }}
                    disabled={endMeasure >= totalMeasures - 1}
                    className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </HoldButton>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Tempos (Départ & Cible) */}
          <div className="grid grid-cols-2 gap-2">
            {/* Start BPM */}
            <div className="flex flex-col gap-1.5">
              <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
                🐢 {t('speedTrainerStartBpm')}
              </label>
              <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex items-center justify-between">
                <HoldButton
                  onAction={() => setStartBpm(prev => Math.max(40, prev - 1))}
                  disabled={startBpm <= 40}
                  className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </HoldButton>
                <div className="text-center flex flex-col items-center">
                  <NumberInput
                    value={startBpm}
                    min={40}
                    max={240}
                    ariaLabel={t('speedTrainerStartBpm')}
                    onChange={(val) => {
                      setStartBpm(val);
                      if (val > targetBpm) {
                        setTargetBpm(val);
                      }
                    }}
                    className="w-16 text-center font-cactus font-bold text-xl tabular-nums leading-none bg-transparent border-b border-transparent focus:border-[#1a1a1a] focus:bg-white/80 focus:outline-none rounded-xs py-0.5 transition-colors"
                  />
                  <span className="text-[9px] font-bold text-[#888]">BPM</span>
                </div>
                <HoldButton
                  onAction={() => {
                    setStartBpm(prev => {
                      const next = Math.min(240, prev + 1);
                      if (next > targetBpm) {
                        setTargetBpm(next);
                      }
                      return next;
                    });
                  }}
                  disabled={startBpm >= 240}
                  className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </HoldButton>
              </div>
            </div>

            {/* Target BPM */}
            <div className="flex flex-col gap-1.5">
              <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
                🎯 {t('speedTrainerTargetBpm')}
              </label>
              <div className="bg-[#fcf9f2] border-2 border-[#1a1a1a] p-2 rounded-xs shadow-[2px_2px_0px_#1a1a1a] flex items-center justify-between">
                <HoldButton
                  onAction={() => {
                    setTargetBpm(prev => {
                      const next = Math.max(40, prev - 1);
                      if (next < startBpm) {
                        setStartBpm(next);
                      }
                      return next;
                    });
                  }}
                  disabled={targetBpm <= 40}
                  className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </HoldButton>
                <div className="text-center flex flex-col items-center">
                  <NumberInput
                    value={targetBpm}
                    min={40}
                    max={240}
                    ariaLabel={t('speedTrainerTargetBpm')}
                    onChange={(val) => {
                      setTargetBpm(val);
                      if (val < startBpm) {
                        setStartBpm(val);
                      }
                    }}
                    className="w-16 text-center font-cactus font-bold text-xl tabular-nums leading-none bg-transparent border-b border-transparent focus:border-[#1a1a1a] focus:bg-white/80 focus:outline-none rounded-xs py-0.5 transition-colors"
                  />
                  <span className="text-[9px] font-bold text-[#888]">BPM</span>
                </div>
                <HoldButton
                  onAction={() => setTargetBpm(prev => Math.min(240, prev + 1))}
                  disabled={targetBpm >= 240}
                  className="w-7 h-7 flex items-center justify-center border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] disabled:opacity-30 disabled:pointer-events-none rounded-xs font-bold cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </HoldButton>
              </div>
            </div>
          </div>

          {/* 3. Accélération & Fréquence */}
          <div className="grid grid-cols-2 gap-2">
            {/* Accélération (+1, +2, +4) */}
            <div className="flex flex-col gap-1.5">
              <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
                📈 {t('speedTrainerStep')}
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[1, 2, 4].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setBpmStep(step)}
                    className={`py-1.5 text-xs font-cactus font-bold border-2 border-[#1a1a1a] rounded-xs transition-all cursor-pointer shadow-[1px_1px_0px_#1a1a1a] ${
                      bpmStep === step
                        ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                        : 'bg-[#fcf9f2] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
                    }`}
                  >
                    +{step}
                  </button>
                ))}
              </div>
            </div>

            {/* Fréquence (Chaque tour / Tous les 2 tours) */}
            <div className="flex flex-col gap-1.5">
              <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666]">
                🔄 {t('speedTrainerInterval')}
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setLoopInterval(1)}
                  className={`py-1.5 px-1 text-[11px] font-cactus font-bold border-2 border-[#1a1a1a] rounded-xs transition-all cursor-pointer shadow-[1px_1px_0px_#1a1a1a] ${
                    loopInterval === 1
                      ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                      : 'bg-[#fcf9f2] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
                  }`}
                >
                  {t('speedTrainerEveryLoop')}
                </button>
                <button
                  type="button"
                  onClick={() => setLoopInterval(2)}
                  className={`py-1.5 px-1 text-[11px] font-cactus font-bold border-2 border-[#1a1a1a] rounded-xs transition-all cursor-pointer shadow-[1px_1px_0px_#1a1a1a] ${
                    loopInterval === 2
                      ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                      : 'bg-[#fcf9f2] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
                  }`}
                >
                  {t('speedTrainerEvery2Loops')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-[#ebe2cb] border-t-2 border-[#1a1a1a] flex items-center justify-between gap-2">
          {isActive ? (
            <button
              type="button"
              onClick={handleStopAndRestore}
              className="w-full py-2.5 px-4 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-sm uppercase tracking-wider shadow-[3px_3px_0px_#1a1a1a] hover:bg-[#722215] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#1a1a1a] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              {t('speedTrainerStop')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLaunch}
              className="w-full py-2.5 px-4 bg-amber-600 text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-sm uppercase tracking-wider shadow-[3px_3px_0px_#1a1a1a] hover:bg-amber-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#1a1a1a] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <XiloLightning size={16} className="fill-current" />
              {t('speedTrainerLaunch')}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
