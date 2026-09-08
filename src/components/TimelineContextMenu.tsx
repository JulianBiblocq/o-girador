import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerStore } from '../stores/useSequencerStore';
import { Copy, Repeat, Trash2, Link } from 'lucide-react';
import { instrumentsConfig } from '../data';

export const TimelineContextMenu: React.FC = () => {
  const menuData = useSequencerStore((state) => state.timelineContextMenu);
  const closeMenu = useSequencerStore((state) => state.closeTimelineContextMenu);
  const duplicate = useSequencerStore((state) => state.duplicateMeasurePattern);
  const repeat = useSequencerStore((state) => state.repeatPatternRange);
  const assign = useSequencerStore((state) => state.handleTimelinePatternAssign);
  const lang = useSequencerStore((state) => state.lang);
  const tracks = useSequencerStore((state) => state.tracks);

  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!menuData) {
      setCoords(null);
      return;
    }

    // Viewport collision adjustment
    const menuWidth = 190;
    const menuHeight = 220;
    const padding = 12;

    const safeX = Math.max(padding, Math.min(menuData.x, window.innerWidth - menuWidth - padding));
    const safeY = Math.max(padding, Math.min(menuData.y, window.innerHeight - menuHeight - padding));
    setCoords({ x: safeX, y: safeY });

    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuData, closeMenu]);

  if (!menuData || !coords) return null;

  const targetTrack = tracks.find((t) => t.id === menuData.trackId);
  const instInfo = targetTrack ? instrumentsConfig[targetTrack.instrumentIdx] : null;
  const trackTitle = targetTrack?.customName || instInfo?.name || (lang === 'fr' ? 'Piste' : 'Faixa');

  const isSlave = !!(targetTrack?.linkedToTrackId && !targetTrack.isLinkFolder && !targetTrack.isLinkMaster);
  const isOverridden = isSlave && targetTrack?.patternOverrides?.[menuData.measureIdx] !== undefined;

  const handleDuplicate = () => {
    duplicate(menuData.trackId, menuData.measureIdx, menuData.measureIdx + 1);
    useSequencerStore.getState().setActiveTimelineCell({
      trackId: menuData.trackId,
      measureIdx: menuData.measureIdx + 1,
    });
    closeMenu();
  };

  const handleRepeat = (count: number) => {
    repeat(menuData.trackId, menuData.measureIdx, count);
    closeMenu();
  };

  const handleResetToMaster = () => {
    assign(menuData.trackId, undefined, menuData.measureIdx);
    closeMenu();
  };

  const handleClear = () => {
    assign(menuData.trackId, null, menuData.measureIdx);
    closeMenu();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[99999] bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] p-1.5 min-w-[190px] select-none text-xs font-cactus animate-in fade-in zoom-in-95 duration-75"
      style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Menu Header (Cordel Style) */}
      <div className="px-2 py-1 mb-1.5 border-b-2 border-[#1a1a1a] font-bold text-[11px] tracking-wider uppercase flex items-center justify-between text-[#1a1a1a]">
        <span className="truncate max-w-[120px]" title={trackTitle}>
          {trackTitle}
        </span>
        <span className="bg-[#1a1a1a] text-[#f4ecd8] px-1.5 py-0.5 rounded-none text-[10px] font-sans font-black">
          M{menuData.measureIdx + 1}
        </span>
      </div>

      {/* Action: Dupliquer (m+1) */}
      <button
        type="button"
        onClick={handleDuplicate}
        className="w-full text-left px-2 py-1.5 font-bold flex items-center justify-between transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs group"
      >
        <div className="flex items-center gap-2">
          <Copy size={13} className="shrink-0" />
          <span>{lang === 'fr' ? 'Dupliquer' : 'Duplicar'}</span>
        </div>
        <span className="text-[9px] font-sans opacity-60 font-semibold group-hover:text-[#f4ecd8] group-hover:opacity-90">
          Ctrl+D
        </span>
      </button>

      {/* Action: Répéter ×2 */}
      <button
        type="button"
        onClick={() => handleRepeat(2)}
        className="w-full text-left px-2 py-1.5 font-bold flex items-center gap-2 transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs"
      >
        <Repeat size={13} className="shrink-0" />
        <span>{lang === 'fr' ? 'Répéter ×2' : 'Repetir ×2'}</span>
      </button>

      {/* Action: Répéter ×4 */}
      <button
        type="button"
        onClick={() => handleRepeat(4)}
        className="w-full text-left px-2 py-1.5 font-bold flex items-center gap-2 transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs"
      >
        <Repeat size={13} className="shrink-0" />
        <span>{lang === 'fr' ? 'Répéter ×4' : 'Repetir ×4'}</span>
      </button>

      <div className="my-1 border-b border-[#1a1a1a]/30" />

      {/* Action: Suivre le maître (for overridden slave track) */}
      {isOverridden && (
        <button
          type="button"
          onClick={handleResetToMaster}
          className="w-full text-left px-2 py-1.5 font-bold flex items-center gap-2 transition-all hover:bg-[#1a1a1a] hover:text-[#f4ecd8] active:translate-x-0.5 cursor-pointer text-xs text-blue-800 hover:text-[#f4ecd8]"
        >
          <Link size={13} className="shrink-0" />
          <span>{lang === 'fr' ? 'Suivre le maître' : 'Seguir mestre'}</span>
        </button>
      )}

      {/* Action: Effacer */}
      <button
        type="button"
        onClick={handleClear}
        className="w-full text-left px-2 py-1.5 font-bold flex items-center gap-2 transition-all hover:bg-[#b71515] hover:text-white active:translate-x-0.5 cursor-pointer text-xs text-[#b71515]"
      >
        <Trash2 size={13} className="shrink-0" />
        <span>{lang === 'fr' ? 'Effacer le motif' : 'Limpar padrão'}</span>
      </button>
    </div>,
    document.body
  );
};
