
import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencer } from '../../contexts/SequencerContext';
import { useWindow } from '../../contexts/WindowContext';
import { TrackFocusSplitButton } from './TrackFocusSplitButton';

interface MixerHeaderProps {
  t: (key: string) => string;
  noBorder?: boolean;
  className?: string;
}

export const MixerHeader: React.FC<MixerHeaderProps> = ({ t, noBorder = false, className = '' }) => {
  const sequencer = useSequencer();
  const currentWindow = useWindow();
  const isPracticeMode = useSequencerStore((s) => s.isPracticeMode);
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
  const apitoItem = list.find((item) => item.inst.id === 'apito');
  const rest = list.filter((item) => item.inst.id !== 'apito');
  const sorted = apitoItem ? [...rest, apitoItem] : list;

  return (
    <div className={`${noBorder ? '' : 'border-b border-[var(--cordel-border,#333)] pb-2 mb-2'} shrink-0 w-full flex items-center gap-2 relative z-50 overflow-visible ${className}`}>
      {!isPracticeMode && (
        <div className="relative shrink-0" ref={addDropRef}>
          <button
            type="button"
            onClick={() => setAddDropOpen(!addDropOpen)}
            className="w-9 h-9 min-w-9 min-h-9 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button flex items-center justify-center transition-all cursor-pointer hover:opacity-80"
            title={t('addInst')}
          >
            <Plus className="w-4 h-4" />
          </button>
          {addDropOpen && (
            <div className="absolute top-10 left-0 w-48 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] shadow-[4px_4px_0_var(--cordel-border)] max-h-[calc(100vh-160px)] overflow-y-auto z-[100]">
              {sorted.map(({ inst, idx }) => (
                <div
                  key={idx}
                  onClick={() => {
                    sequencer.handleAddTrackInstrument(idx, useSequencerStore.getState().currentMeasure);
                    setAddDropOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] border-b border-[var(--cordel-border)] cursor-pointer"
                >
                  <img
                    src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                    alt={inst.name}
                    className="w-4 h-4 object-contain filter invert opacity-80 shrink-0"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                  <span className="truncate">{inst.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <TrackFocusSplitButton />
    </div>
  );
};
