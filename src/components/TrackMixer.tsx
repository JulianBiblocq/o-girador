/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Circle, Language } from '../types';
import { i18n, instrumentsConfig, ASSETS_BASE_URL } from '../data';

interface TrackMixerProps {
  lang: Language;
  circle: Circle;
  index: number;
  totalCircles: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInstrumentChange: (instIdx: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onHideToggle: () => void;
  onDelete: () => void;
  onVolumeChange: (val: number) => void;
  onStepsChange: (steps: number) => void;
  onRepeatsChange: (repeats: number) => void;
  onStepValueChange: (stepIdx: number, val: string) => void;
  onStepKeyDown: (stepIdx: number, key: string, currentVal: string, targetEl: HTMLInputElement) => void;
  onVoiceTypeToggle: (stepIdx: number) => void;
  onVoiceSylChange: (stepIdx: number, val: string) => void;
  onVoiceNoteChange: (stepIdx: number, val: string) => void;
  onVoiceNoteBlur: (stepIdx: number, val: string) => void;
  isPlaying: boolean;
  currentStepIndex: number;
  maxTicks: number;
  timeSig: string;
}

export const TrackMixer: React.FC<TrackMixerProps> = ({
  lang,
  circle,
  index,
  totalCircles,
  onMoveUp,
  onMoveDown,
  onInstrumentChange,
  onMuteToggle,
  onSoloToggle,
  onHideToggle,
  onDelete,
  onVolumeChange,
  onStepsChange,
  onRepeatsChange,
  onStepValueChange,
  onStepKeyDown,
  onVoiceTypeToggle,
  onVoiceSylChange,
  onVoiceNoteChange,
  onVoiceNoteBlur,
  isPlaying,
  currentStepIndex,
  maxTicks,
  timeSig,
}) => {
  const [instDropdownOpen, setInstDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const inst = instrumentsConfig[circle.instrumentIdx];
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  // Click outside listener for the instrument dropdown
  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setInstDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const currentStep = (isPlaying && currentStepIndex >= 0)
    ? Math.floor((currentStepIndex / maxTicks) * circle.steps)
    : -1;

  // Key navigation for Vocal Syllable inputs
  const handleVoiceNav = (el: HTMLInputElement, key: string, type: 'syl' | 'note') => {
    if (key === 'Tab') return; // let browser Tab handle it via step-boxes container
    const parentContainer = el.closest('.step-boxes');
    if (!parentContainer) return;

    const cards = Array.from(parentContainer.querySelectorAll('.v-card'));
    const currentCard = el.closest('.v-card');
    if (!currentCard) return;

    const idx = cards.indexOf(currentCard);

    if ((key === 'ArrowRight' || key === 'Enter') && idx < cards.length - 1) {
      const nextCard = cards[idx + 1] as HTMLElement;
      const input = nextCard.querySelector(type === 'syl' ? '.v-syl' : '.v-note') as HTMLInputElement;
      input?.focus();
      input?.select();
    } else if (key === 'ArrowLeft' && idx > 0) {
      const prevCard = cards[idx - 1] as HTMLElement;
      const input = prevCard.querySelector(type === 'syl' ? '.v-syl' : '.v-note') as HTMLInputElement;
      input?.focus();
      input?.select();
    }
  };

  return (
    <div
      className={`relative border-2 border-[#eaddcf] p-4 mb-4 select-none flex flex-col ${instDropdownOpen ? 'z-50' : 'z-10'}`}
      style={{
        zIndex: instDropdownOpen ? 9999 : 10,
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='w'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.005 0.2' numOctaves='3' /%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23w)' opacity='0.2' /%3E%3C/svg%3E"), linear-gradient(145deg, #2a2420 40%, ${inst.mixerBg} 150%)`,
        boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
        backgroundBlendMode: 'overlay, normal'
      }}
    >
      {/* Decorative cordel line inner frame */}
      <div className="absolute top-[4px] left-[4px] right-[4px] bottom-[4px] border border-[#eaddcf]/30 pointer-events-none z-[1]" />

      {/* Track Header Controls */}
      <div className={`flex justify-between items-center mb-2 relative ${instDropdownOpen ? 'z-[9999]' : 'z-[2]'}`}>
        <div className="flex items-center gap-2">
          {/* Vertical Re-ordering */}
          <div className="flex flex-col gap-[2px] mr-2">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="bg-[#333] text-white border border-[#555] text-[8px] px-1.5 py-[2px] cursor-pointer hover:bg-[#eaddcf] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ▲
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === totalCircles - 1}
              className="bg-[#333] text-white border border-[#555] text-[8px] px-1.5 py-[2px] cursor-pointer hover:bg-[#eaddcf] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ▼
            </button>
          </div>

          {/* Instrument Dropdown Selector */}
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setInstDropdownOpen(!instDropdownOpen)}
              className="flex items-center gap-2 bg-[#111] border border-[#555] px-2 py-1 text-xs cursor-pointer text-white hover:bg-neutral-800 transition-colors"
            >
              <img
                src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                alt={inst.name}
                className="w-4 h-4 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-semibold">
                {index + 1}. {inst.name}
              </span>
              <span className="text-[8px]">▼</span>
            </div>

            {instDropdownOpen && (
              <div className="absolute top-7 left-0 bg-[#222] border border-[#eaddcf] shadow-[0_4px_10px_rgba(0,0,0,0.8)] min-w-[180px] max-h-[220px] overflow-y-auto z-[99]">
                {instrumentsConfig.map((opt, oIdx) => (
                  <div
                    key={oIdx}
                    onClick={() => {
                      onInstrumentChange(oIdx);
                      setInstDropdownOpen(false);
                    }}
                    className="flex items-center gap-3.5 px-3 py-2 cursor-pointer text-xs text-white border-b border-[#333] hover:bg-[#f1c40f] hover:text-black hover:font-bold"
                  >
                    <img
                      src={`${ASSETS_BASE_URL}${opt.iconImg}`}
                      alt={opt.name}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span>{opt.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mute, Solo, Hide, Delete */}
        <div className="flex gap-1.5">
          <button
            onClick={onMuteToggle}
            className={`w-6 h-6 bg-[#333] border border-[#555] text-[10px] font-bold cursor-pointer transition-all ${
              circle.isMute ? 'bg-[#e74c3c] border-[#e74c3c] text-white shadow-[0_0_10px_rgba(231,76,60,0.8)]' : 'text-white'
            }`}
          >
            M
          </button>
          <button
            onClick={onSoloToggle}
            className={`w-6 h-6 bg-[#333] border border-[#555] text-[10px] font-bold cursor-pointer transition-all ${
              circle.isSolo ? 'bg-[#f1c40f] text-black border-[#f1c40f]' : 'text-white'
            }`}
          >
            S
          </button>
          <button
            onClick={onHideToggle}
            className={`w-6 h-6 bg-[#333] border border-[#555] text-[10px] font-bold cursor-pointer transition-all ${
              circle.isHidden ? 'bg-[#34495e] text-[#95a5a6]' : 'text-white'
            }`}
            title="Ocultar pista"
          >
            {circle.isHidden ? '🙈' : '👁️'}
          </button>
          <button
            onClick={onDelete}
            className="w-6 h-6 bg-[#444] hover:bg-[#8b0000] border border-[#555] text-[10px] font-bold cursor-pointer text-white transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Fader slider group */}
      <div className="flex items-center gap-2.5 mb-2 relative z-[2]">
        <input
          type="range"
          min="0"
          max="100"
          value={circle.volumeVal}
          onChange={(e) => onVolumeChange(parseInt(e.target.value))}
          className="flex-grow h-1 bg-[#444] rounded outline-none cursor-pointer accent-[#eaddcf]"
        />
        {/* Dynamic level meter container */}
        <div className="w-[35px] h-2 bg-[#000] relative overflow-hidden border border-[#333]">
          <div
            id={`meter-bar-${circle.id}`}
            className="h-full bg-[#2ecc71] w-0 transition-all duration-[0.05s]"
          />
        </div>
      </div>

      {/* Grid Settings Inputs */}
      <div className="flex justify-between items-center text-[11px] text-[#a0958a] border-t border-dashed border-[#eaddcf]/30 pt-1.5 relative z-[2]">
        <div className="flex items-center gap-1.5">
          <span>{t('stepsNum')}</span>
          <input
            type="number"
            min="2"
            max="32"
            value={circle.steps}
            onChange={(e) => onStepsChange(parseInt(e.target.value) || 4)}
            className="w-10 bg-[#111] border border-[#555] text-white p-0.5 text-center"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span title="Repetições do compasso antes de passar ao seguinte">🔄 x</span>
          <input
            type="number"
            min="1"
            max="64"
            value={circle.repeats || 1}
            onChange={(e) => onRepeatsChange(parseInt(e.target.value) || 1)}
            className="w-8 bg-[#111] border border-[#555] text-white p-0.5 text-center"
          />
        </div>
      </div>

      {/* Steps Inputs (Gongue & Percussions or Vocals card blocks) */}
      <div className="flex gap-2 items-start mt-2 border-t border-dashed border-[#eaddcf]/30 pt-2 relative z-[2] w-full">
        {inst.type === 'voice' ? (
          /* --- CHANT / VOCALS RENDER --- */
          <div className="grid grid-cols-4 gap-1.5 w-full flex-grow step-boxes" id={`voice-boxes-${circle.id}`}>
            {Array.from({ length: circle.steps }).map((_, i) => {
              const state = circle.activeSteps[i];
              const isActive = state !== 0;
              const isPux = state === 'P';
              const syl = circle.lyrics?.[i] || '';
              const note = circle.notes?.[i] || '';

              const typeText = isActive ? (isPux ? 'PUX' : 'CORO') : '---';
              const typeClass = isActive
                ? (isPux ? 'bg-[#ff9f43] text-[#121212]' : 'bg-[#00d2d3] text-[#121212]')
                : 'bg-[#444] text-[#aaa] cursor-default';

              return (
                <div
                  key={i}
                  className={`v-card flex flex-col w-12 bg-[#1a1a1a] border overflow-hidden ${
                    currentStep === i ? 'border-[#2ecc71]' : 'border-[#3a3a3a]'
                  }`}
                >
                  <div
                    onClick={() => onVoiceTypeToggle(i)}
                    className={`text-[9px] font-bold text-center py-0.5 cursor-pointer select-none uppercase ${typeClass}`}
                  >
                    {typeText}
                  </div>
                  
                  <input
                    type="text"
                    value={syl}
                    onChange={(e) => onVoiceSylChange(i, e.target.value)}
                    placeholder="-"
                    className="v-syl w-full text-center text-xs font-bold py-1 bg-transparent border-0 border-b border-[#333] text-[#f1c40f] focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'syl');
                      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
                        handleVoiceNav(e.target as HTMLInputElement, e.key, 'syl');
                      }
                    }}
                  />

                  <input
                    type="text"
                    value={note}
                    onChange={(e) => onVoiceNoteChange(i, e.target.value)}
                    onBlur={(e) => onVoiceNoteBlur(i, e.target.value)}
                    placeholder="Ex:C4"
                    className="v-note w-full text-center text-[10px] py-1 bg-transparent border-0 text-[#aaa] uppercase focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'note');
                      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Enter') {
                        handleVoiceNav(e.target as HTMLInputElement, e.key, 'note');
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          /* --- TRADITIONAL PERCUSSION RENDER --- */
          <div className="step-boxes grid gap-y-2 gap-x-1 w-full flex-grow items-center justify-start" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) 12px repeat(4, minmax(0, 1fr))' }} id={`step-boxes-${circle.id}`}>
            {Array.from({ length: circle.steps }).reduce((acc, _, i) => {
              if (i > 0 && i % 4 === 0 && i % 8 !== 0) {
                acc.push(<div key={`spacer-${i}`} />);
              }

              const val = circle.activeSteps[i];
              let displayVal = val === 0 ? '' : String(val);

              // Mapping for Gonguê display acronyms
              if (val !== 0 && inst.type === 'gongue') {
                if (val === 'GRV') displayVal = 'G';
                else if (val === 'grv') displayVal = 'g';
                else if (val === 'AIG') displayVal = 'A';
                else if (val === 'aig') displayVal = 'a';
              }

              // Decide spacer visual borders depending on current time signature
              let extraStyle = '';
              let isBeatBound = false;
              if (timeSig === '6/8' || timeSig === '12/8') {
                if ((i + 1) % 3 === 0) isBeatBound = true;
              } else if (timeSig === '3/4') {
                const stepDiv = circle.steps === 12 ? 4 : Math.floor(circle.steps / 3);
                if ((i + 1) % (stepDiv || 4) === 0) isBeatBound = true;
              } else {
                const stepDiv = Math.floor(circle.steps / (timeSig === '4/4' ? 4 : 2));
                if ((i + 1) % (stepDiv || 4) === 0) isBeatBound = true;
              }

              if (isBeatBound && i !== circle.steps - 1) {
                extraStyle = 'margin-right: 10px;';
              }

              let colorStyle: React.CSSProperties = {};
              if (val !== 0 && val !== '') {
                const bgColor = inst.colors[val] || '#111';
                let txtColor = inst.colors.text || '#fff';
                if (inst.id === 'gongue' && (val === 'AIG' || val === 'aig')) {
                  txtColor = '#000';
                }
                colorStyle = {
                  backgroundColor: bgColor,
                  borderColor: bgColor,
                  color: txtColor,
                };
              }

              acc.push(
                <div key={i} className="relative flex flex-col items-center justify-center w-full">
                  <div className="text-[#888] text-[8px] mb-0.5 w-full text-center">{i + 1}</div>
                  <input
                    type="text"
                    maxLength={1}
                    value={displayVal}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => onStepValueChange(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' || e.key === 'Enter') e.preventDefault();
                      const inputEl = e.currentTarget as HTMLInputElement;
                      onStepKeyDown(i, e.key, inputEl.value, inputEl);
                    }}
                    className={`w-full aspect-square text-center text-sm font-mono font-bold bg-[#111] border rounded-sm outline-none p-0 box-border text-[#f1c40f] focus:border-[#eaddcf] focus:shadow-[0_0_4px_#eaddcf] transition-all duration-200 ${
                      currentStep === i ? 'border-[#2ecc71] ring-2 ring-[#2ecc71] scale-105' : 'border-[#555]'
                    }`}
                    style={colorStyle}
                  />
                </div>
              );
              return acc;
            }, [] as React.ReactNode[])}
          </div>
        )}
      </div>
    </div>
  );
};
