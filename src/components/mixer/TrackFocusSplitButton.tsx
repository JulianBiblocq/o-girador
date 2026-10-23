
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAuth } from '../../contexts/AuthContext';
import { useWindow } from '../../contexts/WindowContext';
import { instrumentsConfig } from '../../data';
import { TrackFocusDropdownPanel } from './TrackFocusDropdownPanel';
import { CordelTarget } from '../ui/CordelTarget';

interface TrackFocusSplitButtonProps {
  className?: string;
}

export const TrackFocusSplitButton: React.FC<TrackFocusSplitButtonProps> = ({ className = '' }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const { userProfile } = useAuth();
  const currentWindow = useWindow();

  const tracks = useSequencerStore((s) => s.tracks);
  const isFocusActive = useSequencerStore((s) => s.isFocusActive);
  const focusTrackId = useSequencerStore((s) => s.focusTrackId);
  const toggleFocusMode = useSequencerStore((s) => s.toggleFocusMode);
  const syncFocusWithTracks = useSequencerStore((s) => s.syncFocusWithTracks);
  const lang = useSequencerStore((s) => s.lang);

  useEffect(() => {
    syncFocusWithTracks(tracks, userProfile);
  }, [tracks, userProfile, syncFocusWithTracks]);

  const targetTrack = tracks.find((t) => t.id === focusTrackId);
  const inst = targetTrack ? instrumentsConfig[targetTrack.instrumentIdx] : null;
  const rawName = targetTrack?.customName || inst?.name || (lang === 'pt' ? 'Instrumento' : 'Instrument');
  const shortName = rawName.replace(/\s*\([^)]*\)/g, '').replace(/^\d+[\.\s\-]+/, '').trim();

  const handleToggleDropdown = () => {
    if (!dropdownOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setDropdownOpen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center w-full h-9 border-2 border-[#1a1a1a] bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus select-none overflow-visible ${className}`}
    >
      <button
        type="button"
        onClick={() => toggleFocusMode(focusTrackId ?? undefined)}
        className={`flex-1 min-w-0 px-2 h-full flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
          isFocusActive
            ? 'bg-[#c25e38] text-[#f4ecd8] shadow-inner'
            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:opacity-80'
        }`}
        title={
          isFocusActive
            ? (lang === 'pt' ? 'Desativar modo Focus' : 'Désactiver le mode Focus')
            : (lang === 'pt' ? `Ativar modo Focus em ${shortName}` : `Activer le mode Focus sur ${shortName}`)
        }
      >
        <CordelTarget size={14} className={isFocusActive ? 'text-[#f4ecd8] shrink-0' : 'text-current shrink-0'} />
        <span className="truncate min-w-0 flex-1 text-left">
          Focus : {shortName}
        </span>
      </button>

      <button
        type="button"
        onClick={handleToggleDropdown}
        className={`w-7 h-full shrink-0 border-l-2 border-[#1a1a1a] flex items-center justify-center transition-colors cursor-pointer ${
          dropdownOpen
            ? 'bg-[#1a1a1a] text-[#f4ecd8]'
            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:opacity-80'
        }`}
        title={lang === 'pt' ? 'Opções do Focus' : 'Options du Focus'}
      >
        <ChevronDown size={16} className={`w-4 h-4 transform transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownOpen && currentWindow?.document?.body && createPortal(
        <TrackFocusDropdownPanel
          tracks={tracks}
          focusTrackId={focusTrackId}
          onClose={() => setDropdownOpen(false)}
          lang={lang}
          position={panelPos}
        />,
        currentWindow.document.body
      )}
    </div>
  );
};
