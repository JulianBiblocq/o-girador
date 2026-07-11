/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { instrumentsConfig, ASSETS_BASE_URL, i18n } from '../data';
import { useSequencer } from '../contexts/SequencerContext';
import { useSequencerStore } from '../stores/useSequencerStore';

interface MixerAddChannelProps {
  isActive?: boolean;
}

export const MixerAddChannel: React.FC<MixerAddChannelProps> = ({ isActive = true }) => {
  const sequencer = useSequencer();
  const lang = useSequencerStore(state => state.lang);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const t = (key: string) => (i18n[lang] as any)[key] || key;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isActive) return null;

  return (
    <div
      className="flex flex-col bg-[var(--cordel-bg)]/40 w-[42px] h-full justify-between shrink-0 text-[var(--cordel-text)] overflow-visible relative transition-all duration-300 border-2 border-dashed border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)]/80 hover:bg-[var(--cordel-bg)]/60"
      style={{
        paddingTop: '3px',
        paddingBottom: '15px',
        marginRight: '16px',
        borderRadius: '3px',
      }}
    >
      {/* Top Section with + Button */}
      <div className="relative p-1 flex flex-col items-center border-b border-[var(--cordel-border)]/20 h-[76px] shrink-0 justify-center">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-7 h-7 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer"
          title={lang === 'fr' ? 'Ajouter un instrument' : 'Adicionar instrumento'}
        >
          <Plus size={16} />
        </button>

        {dropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-16 left-0 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-shadow max-h-[300px] overflow-y-auto z-[99] w-[180px] custom-scrollbar"
          >
            <div className="text-[9px] uppercase opacity-60 font-bold px-2 py-1 bg-[var(--cordel-text)]/5 border-b border-[var(--cordel-border)]/20">
              {lang === 'fr' ? 'Ajouter un instrument' : 'Adicionar instrumento'}
            </div>
            {(() => {
              const list = instrumentsConfig
                .map((inst, idx) => ({ inst, idx }))
                .filter(({ inst }) => inst.id !== 'puxador' && inst.id !== 'coro');
              const apitoItem = list.find(item => item.inst.id === 'apito');
              const rest = list.filter(item => item.inst.id !== 'apito');
              const sorted = apitoItem ? [...rest, apitoItem] : list;

              return sorted.map(({ inst, idx }) => (
                <div
                  key={idx}
                  onClick={() => {
                    sequencer.handleAddTrackInstrument(idx, useSequencerStore.getState().currentMeasure);
                    setDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer border-b border-[var(--cordel-border)]/20 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-[10px] font-bold"
                >
                  <img
                    src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                    alt={inst.name}
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="font-cactus">{inst.name}</span>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Vertical Label Strip */}
      <div
        className="flex-grow flex items-center justify-center select-none"
        onClick={() => setDropdownOpen(true)}
      >
        <span
          className="font-cactus font-bold text-[10px] tracking-widest text-[var(--cordel-text)]/40 hover:text-[var(--cordel-text)]/80 transition-colors uppercase cursor-pointer"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          {lang === 'fr' ? 'Nouveau' : 'Novo'}
        </span>
      </div>
    </div>
  );
};
