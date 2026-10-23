import React, { useState, useEffect } from 'react';
import { ASSETS_BASE_URL } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Activity } from 'lucide-react';

interface TimelineTrackHeaderProps {
  trackId: number; trackIndex: number; HEADER_W: number; isMobile: boolean; isChild: boolean;
  busColor: string | null; canFold: boolean; isCollapsed: boolean; onToggleFold: () => void;
  instIconImg: string; instName: string; displayName: string; customName?: string;
  lang: string; isAutomationOpen: boolean; onToggleAutomation?: () => void;
  isMute?: boolean;
}

export const TimelineTrackHeader: React.FC<TimelineTrackHeaderProps> = ({
  trackId, trackIndex, HEADER_W, isMobile, isChild, busColor, canFold, isCollapsed,
  onToggleFold, instIconImg, instName, displayName, customName, lang, isAutomationOpen, onToggleAutomation,
  isMute = false,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(customName || instName);

  useEffect(() => { setNameVal(customName || instName); }, [customName, instName]);

  const handleRenameSubmit = () => {
    setIsEditingName(false);
    useSequencerStore.getState().setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, customName: nameVal.trim() || undefined } : t)));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit();
    else if (e.key === 'Escape') { setIsEditingName(false); setNameVal(customName || instName); }
  };

  const handleSelectTrack = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return;
    useSequencerStore.getState().selectTrackTimelineCells(trackId, e.shiftKey || e.ctrlKey || e.metaKey);
  };

  return (
    <div
      className={`timeline-sticky-header sticky left-0 z-40 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center justify-between py-1 shadow-[2px_0_5px_rgba(0,0,0,0.15)] shrink-0 ${isMobile ? (isChild ? 'pl-3 pr-1' : 'px-1') : (isChild ? 'pl-8 pr-3' : 'px-3')}`}
      style={{ width: HEADER_W, minWidth: HEADER_W, transformOrigin: '0 0', borderLeft: busColor ? `4px solid ${busColor}` : undefined }}
      onClick={handleSelectTrack}
    >
      <div className={`flex items-center min-w-0 flex-grow ${isMobile ? 'gap-0.5' : 'gap-2'} ${isMute ? 'opacity-40' : ''}`}>
        {canFold && (
          <button onClick={onToggleFold} className="p-0.5 hover:bg-[var(--cordel-text)]/10 rounded cursor-pointer text-[10px] font-bold mr-1 shrink-0 flex items-center justify-center w-4 h-4 border border-[var(--cordel-border)]/30 text-[var(--cordel-text)] pointer-events-auto" title={isCollapsed ? (lang === 'fr' ? 'Déplier' : 'Desdobrar') : (lang === 'fr' ? 'Plier' : 'Dobrar')}>
            {isCollapsed ? '►' : '▼'}
          </button>
        )}
        {isMobile && <span className="font-mono text-[10px] text-[var(--cordel-text)]/60 shrink-0">#{trackIndex + 1}</span>}
        <img
          src={`${ASSETS_BASE_URL}${instIconImg}`} alt={instName}
          onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().selectTrackTimelineCells(trackId, e.shiftKey || e.ctrlKey || e.metaKey); }}
          className={`track-header-icon object-contain filter invert-[var(--cordel-invert)] dark:invert-0 shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`}
          title={lang === 'fr' ? 'Cliquer pour sélectionner la piste' : 'Clique para selecionar a faixa'}
        />

        {!isMobile && (isEditingName ? (
          <input
            type="text" value={nameVal} onChange={(e) => setNameVal(e.target.value)} onBlur={handleRenameSubmit} onKeyDown={handleKeyDown}
            className="font-cactus font-bold text-sm bg-transparent text-[var(--cordel-text)] focus:bg-[var(--cordel-bg)] cordel-border-sm px-1 py-0.5 outline-none max-w-[120px] text-left"
            autoFocus onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            onClick={(e) => { e.stopPropagation(); useSequencerStore.getState().selectTrackTimelineCells(trackId, e.shiftKey || e.ctrlKey || e.metaKey); }}
            onDoubleClick={(e) => { e.stopPropagation(); setIsEditingName(true); }}
            className="track-header-name font-cactus text-sm font-bold truncate text-[var(--cordel-text)] tracking-wider cursor-pointer hover:bg-[var(--cordel-text)]/10 rounded px-1 select-none"
            title={lang === 'fr' ? 'Cliquer pour sélectionner la piste, double-cliquer pour renommer' : 'Clique para selecionar a faixa, duplo clique para renomear'}
          >
            {displayName}
          </span>
        ))}

        <button
          onClick={(e) => { e.stopPropagation(); onToggleAutomation?.(); }}
          className={`p-0.5 rounded cursor-pointer shrink-0 flex items-center justify-center transition-all ml-auto pointer-events-auto ${isAutomationOpen ? 'bg-[#8b2a1a] text-[#f4ecd8] border border-[var(--cordel-border)] shadow-sm' : 'bg-transparent hover:bg-[var(--cordel-text)]/10 text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)] border border-transparent hover:border-[var(--cordel-border)]/30'}`}
          style={{ width: '22px', height: '22px' }}
          title={lang === 'fr' ? (isAutomationOpen ? "Masquer l'automation" : "Afficher l'automation") : (isAutomationOpen ? 'Ocultar automação' : 'Mostrar automação')}
        >
          <Activity className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
