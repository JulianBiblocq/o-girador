/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencer } from '../../contexts/SequencerContext';
import { useWindow } from '../../contexts/WindowContext';

interface MixerHeaderProps {
  t: (key: string) => string;
  noBorder?: boolean;
  className?: string;
}

export const MixerHeader: React.FC<MixerHeaderProps> = ({ t, noBorder = false, className = '' }) => {
  const sequencer = useSequencer();
  const currentWindow = useWindow();
  const isTracksCollapsed = useSequencerStore(state => state.isTracksCollapsed);
  const toggleTracksCollapsed = useSequencerStore(state => state.toggleTracksCollapsed);

  const [addDropOpen, setAddDropOpen] = useState(false);
  const addDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (addDropRef.current && !addDropRef.current.contains(e.target as Node)) {
        setAddDropOpen(false);
      }
    }
    if (addDropOpen) {
      currentWindow.document.addEventListener('mousedown', handleClickOutside);
      currentWindow.document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      currentWindow.document.removeEventListener('mousedown', handleClickOutside);
      currentWindow.document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [addDropOpen, currentWindow]);

  const list = instrumentsConfig
    .map((inst, idx) => ({ inst, idx }))
    .filter(({ inst }) => inst.id !== 'puxador' && inst.id !== 'coro');
  const apitoItem = list.find(item => item.inst.id === 'apito');
  const rest = list.filter(item => item.inst.id !== 'apito');
  const sorted = apitoItem ? [...rest, apitoItem] : list;

  return (
    <div className={`${noBorder ? '' : 'border-b border-[var(--cordel-border,#333)] pb-2.5 mb-4'} shrink-0 w-full flex items-center gap-2 relative z-30 ${className}`}>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          toggleTracksCollapsed();
        }}
        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button px-3 py-2 text-sm font-extrabold cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors flex-shrink-0 flex items-center justify-center"
        title={isTracksCollapsed ? t('expandSteps') : t('collapseSteps')}
      >
        {isTracksCollapsed ? '▶' : '◀'}
      </button>

      <div className="relative flex-1" ref={addDropRef}>
        <button
          onClick={() => setAddDropOpen(!addDropOpen)}
          className="w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button px-3 py-2 text-xs font-bold font-cactus uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:opacity-80"
        >
          <Plus className="w-3.5 h-3.5" /> {t('addInst')} <span className="text-[8px] opacity-60">▼</span>
        </button>
        {addDropOpen && (
          <div className="absolute top-10 left-0 w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] shadow-[4px_4px_0_var(--cordel-border)] max-h-[calc(100vh-160px)] overflow-y-auto z-[100]">
            {sorted.map(({ inst, idx }) => (
              <div
                key={idx}
                onClick={() => {
                  sequencer.handleAddTrackInstrument(idx, useSequencerStore.getState().currentMeasure);
                  setAddDropOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] border-b border-[var(--cordel-border)] cursor-pointer"
              >
                <img
                  src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                  alt={inst.name}
                  className="w-5 h-5 object-contain filter invert opacity-80"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span>{inst.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
