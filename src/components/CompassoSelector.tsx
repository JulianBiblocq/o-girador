import React, { useMemo, useEffect, useState } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudio } from '../contexts/AudioContext';
import { getExpandedMeasures } from '../utils/measureHelpers';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';

interface CompassoSelectorProps {
  className?: string;
  style?: React.CSSProperties;
}

export const CompassoSelector: React.FC<CompassoSelectorProps> = ({ className = '', style }) => {
  const lang = useSequencerStore(state => state.lang);
  const currentMeasure = useSequencerStore(state => state.currentMeasure);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const songSections = useSequencerStore(state => state.songSections);
  const currentExpandedMeasureIdx = useSequencerStore(state => state.currentExpandedMeasureIdx);

  const audio = useAudio();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const metadata = useSequencerStore(state => state.metadata);
  const measureSignals = useSequencerStore(state => state.measureSignals || []);
  const setMeasureSignals = useSequencerStore(state => state.setMeasureSignals);
  const mestreSignals = useSequencerStore(state => state.mestreSignals || []);
  const enabledSignalIds = useSequencerSettingsStore(state => state.enabledSignalIds);

  const localRhythmSignals = metadata?.rhythmSignals || [];
  const rhythmSignals = useMemo(() => [
    ...mestreSignals.map(s => ({ id: s.id, name: s.name, image: s.imageUrl, isCloud: true })),
    ...localRhythmSignals.map(s => ({ id: s.id, name: s.name, image: s.image, isCloud: false }))
  ], [mestreSignals, localRhythmSignals]);

  const sigId = (measureSignals && currentExpandedMeasureIdx < measureSignals.length) ? measureSignals[currentExpandedMeasureIdx] : null;
  const activeSig = rhythmSignals.find(s => s.id === sigId) || null;

  const expanded = useMemo(() => getExpandedMeasures(totalMeasures, songSections), [totalMeasures, songSections]);
  const displayTotal = expanded.length > 0 ? expanded.length : totalMeasures;

  // Synchronize external measure changes (e.g. from playback or timeline clicks) to the expanded index
  useEffect(() => {
    const currentBase = expanded[currentExpandedMeasureIdx]?.baseMeasure;
    if (currentBase !== currentMeasure) {
      const firstMatch = expanded.findIndex(item => item.baseMeasure === currentMeasure);
      if (firstMatch !== -1) {
        useSequencerStore.getState().setCurrentExpandedMeasureIdx(firstMatch);
      }
    }
  }, [currentMeasure, expanded, currentExpandedMeasureIdx]);

  const displayMeasure = currentExpandedMeasureIdx + 1;

  const handleNavigatePrev = () => {
    if (displayTotal <= 0) return;
    const prevIdx = (currentExpandedMeasureIdx - 1 + displayTotal) % displayTotal;
    useSequencerStore.getState().setCurrentExpandedMeasureIdx(prevIdx);
    const targetBaseMeasure = expanded.length > 0 ? expanded[prevIdx].baseMeasure : prevIdx;
    audio.handleTimelineNavigate(targetBaseMeasure, 0, 16);
  };

  const handleNavigateNext = () => {
    if (displayTotal <= 0) return;
    const nextIdx = (currentExpandedMeasureIdx + 1) % displayTotal;
    useSequencerStore.getState().setCurrentExpandedMeasureIdx(nextIdx);
    const targetBaseMeasure = expanded.length > 0 ? expanded[nextIdx].baseMeasure : nextIdx;
    audio.handleTimelineNavigate(targetBaseMeasure, 0, 16);
  };

  return (
    <div
      className={`flex flex-col items-center bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm p-1 shadow-[2px_2px_0px_rgba(0,0,0,1)] select-none rounded-sm ${className}`}
      style={style}
    >
      <span className="text-[8px] uppercase opacity-75 tracking-wider font-bold leading-none">
        {lang === 'pt' ? 'Compasso' : 'Mesure'}
      </span>
      <div className="flex items-center justify-between w-full mt-1 gap-1 px-1">
        <button
          onClick={(e) => { e.stopPropagation(); handleNavigatePrev(); }}
          className="w-5 h-5 flex items-center justify-center bg-[#f4ecd8] text-[#1a1a1a] border border-black font-bold text-[10px] cursor-pointer hover:bg-black hover:text-[#f4ecd8] transition-colors rounded-sm active:scale-95"
          title={lang === 'pt' ? 'Compasso anterior' : 'Mesure précédente'}
          style={{ padding: 0 }}
        >
          &lt;
        </button>
        <span className="text-xs font-cactus font-bold leading-none flex-grow text-center min-w-[45px]">
          {displayMeasure} / {displayTotal}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); handleNavigateNext(); }}
          className="w-5 h-5 flex items-center justify-center bg-[#f4ecd8] text-[#1a1a1a] border border-black font-bold text-[10px] cursor-pointer hover:bg-black hover:text-[#f4ecd8] transition-colors rounded-sm active:scale-95"
          title={lang === 'pt' ? 'Próximo compasso' : 'Mesure suivante'}
          style={{ padding: 0 }}
        >
          &gt;
        </button>
      </div>

      {/* Ligne de signal */}
      <div className="w-full border-t border-black/10 mt-1 pt-1 flex items-center justify-center relative">
        {activeSig ? (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
              className="flex items-center gap-1 px-1.5 py-0.5 bg-black/5 hover:bg-black/10 transition-colors rounded text-[9px] font-bold text-[#1a1a1a] max-w-[130px] truncate"
              title={activeSig.name}
            >
              {activeSig.image ? (
                <img src={activeSig.image} alt={activeSig.name} className="w-5 h-5 object-contain flex-shrink-0" />
              ) : (
                <span className="text-[10px] flex-shrink-0 leading-none">📢</span>
              )}
              <span className="truncate max-w-[80px]">{activeSig.name}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newSignals = [...measureSignals];
                newSignals[currentExpandedMeasureIdx] = null;
                setMeasureSignals(newSignals);
              }}
              className="text-[10px] text-red-600 hover:text-red-800 font-bold px-1 hover:scale-110 active:scale-95 transition-transform"
              title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
            className="px-2 py-0.5 flex items-center gap-1 bg-[#f4ecd8] text-[#1a1a1a]/60 border border-dashed border-[#1a1a1a]/30 rounded text-[9px] font-bold hover:bg-black/5 hover:text-[#1a1a1a] transition-colors cursor-pointer"
            title={lang === 'fr' ? 'Ajouter un signal' : 'Adicionar sinal'}
          >
            <span>➕</span>
            <span>{lang === 'fr' ? 'Signal' : 'Sinal'}</span>
          </button>
        )}

        {/* Dropdown de sélection */}
        {dropdownOpen && (
          <div
            className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-[100] bg-[#f4ecd8] border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] min-w-[160px] max-h-[220px] overflow-y-auto flex flex-col py-1 rounded-sm"
            onClick={e => e.stopPropagation()}
          >
            {/* Aucun signal */}
            <button
              onClick={() => {
                const newSignals = [...measureSignals];
                newSignals[currentExpandedMeasureIdx] = null;
                setMeasureSignals(newSignals);
                setDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1 text-[10px] font-bold text-[#1a1a1a] hover:bg-black/10 cursor-pointer text-left w-full"
            >
              <span className="text-xs opacity-50">✕</span>
              <span className="opacity-70">{lang === 'fr' ? 'Aucun' : 'Nenhum'}</span>
            </button>
            <div className="border-t border-black/10 my-0.5" />
            {rhythmSignals
              .filter(sig => enabledSignalIds === null || enabledSignalIds.includes(sig.id))
              .map(sig => (
              <button
                key={sig.id}
                onClick={() => {
                  const newSignals = [...measureSignals];
                  newSignals[currentExpandedMeasureIdx] = sig.id;
                  setMeasureSignals(newSignals);
                  setDropdownOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-1 text-[10px] font-bold text-[#1a1a1a] hover:bg-black/10 cursor-pointer text-left w-full ${
                  sigId === sig.id ? 'bg-black/15' : ''
                }`}
              >
                {sig.image ? (
                  <img src={sig.image} alt={sig.name} className="w-5 h-5 object-contain flex-shrink-0" />
                ) : (
                  <span className="text-[10px] w-5 h-5 flex items-center justify-center bg-black/10 rounded flex-shrink-0 leading-none">📢</span>
                )}
                <span className="truncate w-full">{sig.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
