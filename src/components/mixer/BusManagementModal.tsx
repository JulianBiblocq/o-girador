import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { TrackGroup } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';

interface BusManagementModalProps {
  busTrack: TrackGroup;
  isOpen: boolean;
  onClose: () => void;
}

export const BusManagementModal: React.FC<BusManagementModalProps> = ({ busTrack, isOpen, onClose }) => {
  const lang = useSequencerStore((s) => s.lang);
  const tracks = useSequencerStore((s) => s.tracks);
  const [nameVal, setNameVal] = useState(busTrack.customName || (busTrack.isLinkFolder ? 'ALFAIAS' : 'Bus'));

  if (!isOpen) return null;

  const handleNameSave = () => {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== busTrack.customName) {
      useSequencerStore.getState().setTracks((prev) =>
        prev.map((t) => (t.id === busTrack.id ? { ...t, customName: trimmed } : t))
      );
    }
  };

  const handleToggleMember = (targetTrackId: number, isCurrentlyMember: boolean) => {
    useSequencerStore.getState().handleAssignToBus(targetTrackId, isCurrentlyMember ? null : String(busTrack.id));
  };

  const isAudioBus = busTrack.isBusFolder && !busTrack.isLinkFolder;
  const projectTracks = tracks.filter((t) => !t.isBusFolder && !t.isLinkFolder);

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border shadow-[4px_4px_0px_#1a1a1a] p-4 max-w-sm w-full flex flex-col gap-3 font-cactus"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[var(--cordel-border)] pb-2">
          <span className="font-bold text-sm tracking-wider uppercase">
            {lang === 'fr' ? 'Gestion du Bus' : 'Gerenciamento do Bus'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center cordel-border-sm hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wide">
            {lang === 'fr' ? 'Nom du Bus' : 'Nome do Bus'}
          </label>
          <input
            type="text"
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleNameSave();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm px-2 py-1 text-sm font-bold outline-none focus:ring-1 focus:ring-[var(--cordel-border)]"
            autoFocus
          />
        </div>

        {isAudioBus && (
          <div className="flex flex-col gap-1.5 mt-1">
            <span className="text-xs font-bold uppercase tracking-wide border-b border-[var(--cordel-border)]/40 pb-1">
              {lang === 'fr' ? 'Instruments dans ce bus' : 'Instrumentos neste bus'}
            </span>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
              {projectTracks.map((t) => {
                const isMember = String(t.busId) === String(busTrack.id);
                const inst = instrumentsConfig[t.instrumentIdx];
                const trackName = t.customName || inst?.name || `Track ${t.id}`;
                return (
                  <label
                    key={t.id}
                    onClick={() => handleToggleMember(t.id, isMember)}
                    className="flex items-center justify-between p-1.5 cordel-border-sm hover:bg-[var(--cordel-text)]/10 cursor-pointer transition-colors text-xs"
                  >
                    <span className="font-bold truncate">{trackName}</span>
                    <div
                      className={`w-4 h-4 flex items-center justify-center cordel-border-sm ${
                        isMember ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]' : 'bg-transparent'
                      }`}
                    >
                      {isMember && <Check size={11} strokeWidth={3} />}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            handleNameSave();
            onClose();
          }}
          className="mt-2 py-1.5 px-3 bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold text-xs uppercase cordel-border-sm hover:bg-[var(--cordel-bg)] hover:text-[var(--cordel-text)] cursor-pointer transition-colors self-end"
        >
          {lang === 'fr' ? 'Fermer' : 'Fechar'}
        </button>
      </div>
    </div>
  );
};
