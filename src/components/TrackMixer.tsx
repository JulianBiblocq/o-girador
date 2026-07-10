import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { i18n, instrumentsConfig, ASSETS_BASE_URL } from '../data';
import { useSequencerStore, isToadaBus } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { XiloChisel } from './XiloIcons';

interface TrackMixerProps {
  trackId: number;
  index: number;
  totalTracks: number;
  onOpenDetailEditor: (trackId: number) => void;
  isActive?: boolean;
}

const TrackMixerComponent: React.FC<TrackMixerProps> = ({
  trackId,
  index,
  totalTracks,
  onOpenDetailEditor,
  isActive = true,
}) => {
  const lang = useSequencerStore(state => state.lang);
  const activeAoVivoTrackId = useSequencerStore(state => state.activeAoVivoTrackId);
  const setActiveAoVivoTrackId = useSequencerStore(state => state.setActiveAoVivoTrackId);
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const tracks = useSequencerStore(state => state.tracks);
  const isMaster = useSequencerStore(state => state.tracks.some(t => String(t.linkedToTrackId) === String(trackId)));

  const onInstrumentChange = (instIdx: number) => {
    useSequencerStore.getState().handleTrackInstrumentIdxChange(trackId, instIdx);
  };
  const onMuteToggle = () => {
    useSequencerStore.getState().handleTrackMuteToggle(trackId);
  };
  const onSoloToggle = () => {
    useSequencerStore.getState().handleTrackSoloToggle(trackId);
  };
  const onHideToggle = () => {
    useSequencerStore.getState().handleTrackHideToggle(trackId);
  };
  const onDelete = () => {
    useSequencerStore.getState().handleTrackDelete(trackId);
  };
  const onOpenDetailEditorClick = () => {
    onOpenDetailEditor(trackId);
  };

  const [instDropdownOpen, setInstDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setInstDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isToada = track ? isToadaBus(track) : false;

  const activeChildTrack = useMemo(() => {
    if (!isToada) return null;
    const pux = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
    const coro = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
    
    const globalSelectedId = useAudioStore.getState().selectedVocalPatternId;
    if (globalSelectedId) {
      if (pux && pux.patterns.some(p => p.id === globalSelectedId)) return pux;
      if (coro && coro.patterns.some(p => p.id === globalSelectedId)) return coro;
    }
    
    const currentMeasure = useSequencerStore.getState().currentMeasure;
    const coroPtn = coro?.patterns.find(p => p.measureAssignments[currentMeasure]);
    if (coroPtn) return coro;
    
    const puxPtn = pux?.patterns.find(p => p.measureAssignments[currentMeasure]);
    if (puxPtn) return pux;
    
    return coro || pux || null;
  }, [isToada, tracks]);

  const effectiveTrack = isToada ? (activeChildTrack || track) : track;
  const inst = effectiveTrack ? instrumentsConfig[effectiveTrack.instrumentIdx] : null;

  const slaves = tracks.filter(t => String(t.linkedToTrackId) === String(trackId));
  const getPluralName = (name: string) => {
    if (name.includes('Alfaia')) return 'Alfaias';
    if (name === 'Caixa') return 'Caixas';
    if (name === 'Tarol') return 'Tarols';
    if (name === 'Agbê') return 'Agbês';
    if (name === 'Mineiro') return 'Mineiros';
    if (name === 'Gonguê') return 'Gonguês';
    return name + 's';
  };
  const linkedSlavesTooltip = isMaster && inst
    ? `${lang === 'fr' ? 'Lié' : 'Vinculado'} : ${inst.name.replace('Alfaia ', '')} et ${slaves.map(s => instrumentsConfig[s.instrumentIdx]?.name.replace('Alfaia ', '')).join(', ')}`
    : undefined;
  const displayName = isToada
    ? 'Toada'
    : (inst ? (isMaster ? `🔗 ${getPluralName(inst.name)}` : inst.name) : 'Instrument');

  const isAoVivo = track ? activeAoVivoTrackId === track.id : false;
  const toggleAoVivo = () => {
    if (!track) return;
    if (useSequencerStore.getState().isEcoMode) {
      alert("Mode Éco activé : Les animations d'instruments (AoVivo) ont été désactivées pour préserver les performances.");
      return;
    }
    setActiveAoVivoTrackId(isAoVivo ? null : track.id);
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: track ? `track-${track.id}` : 'track-temp' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!track || !inst) return null;

  return (
    <div
      ref={setNodeRef}
      className="cordel-border p-3 flex flex-col relative transition-all duration-300 bg-[var(--cordel-bg)] w-full py-1 border-x-0 border-t-0 border-b-2 h-[76px] min-h-[76px] justify-center"
      style={{
        ...style,
        zIndex: instDropdownOpen ? 9999 : 10,
        '--cordel-bg': '#f4ecd8',
        '--cordel-text': '#1a1a1a',
        '--cordel-border': '#1a1a1a',
        '--fader-thumb-bg': '#8b2a1a',
        '--fader-thumb-border': '#1a1a1a',
      } as React.CSSProperties}
    >
      <div className="flex justify-between items-center relative z-[2]">
        <div className="flex items-center gap-2">
          <div
            {...(inst.id !== 'apito' ? attributes : {})}
            {...(inst.id !== 'apito' ? listeners : {})}
            className={`mr-2 transition-colors p-1 touch-none flex-shrink-0 ${
              inst.id === 'apito' 
                ? 'opacity-0 pointer-events-none' 
                : 'cursor-grab active:cursor-grabbing text-[var(--cordel-text)]/60 hover:text-[var(--cordel-text)]'
            }`}
            title={inst.id !== 'apito' ? "Drag to reorder" : undefined}
          >
            <GripVertical size={16} />
          </div>

          <div className="relative flex items-center" ref={dropdownRef}>
            <button
              onClick={() => setInstDropdownOpen(!instDropdownOpen)}
              className="flex items-center justify-between gap-1.5 cordel-border-sm cordel-button px-1.5 py-0.5 text-[11px] cursor-pointer transition-colors w-[110px] sm:w-[120px]"
              style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
              title={linkedSlavesTooltip}
            >
              <img
                src={`${ASSETS_BASE_URL}${inst.iconImg}`}
                alt={inst.name}
                className="w-4 h-4 object-contain flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-cactus font-bold text-center leading-[1.1] flex-1">
                {index + 1}. {displayName.split(' ')[0]}
                {displayName.indexOf(' ') !== -1 && <><br/>{displayName.substring(displayName.indexOf(' ') + 1)}</>}
              </span>
              <span className="text-[8px] flex-shrink-0">▼</span>
            </button>

            {onOpenDetailEditor && !track.isBusFolder && (
              <button
                onClick={onOpenDetailEditorClick}
                className="ml-1 flex items-center justify-center w-[22px] h-[22px] cordel-border-sm cordel-button text-[10px] cursor-pointer transition-colors bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
                title={lang === 'pt' ? 'Editor detalhado' : 'Éditeur détaillé'}
              >
                <XiloChisel size={10} />
              </button>
            )}

            {track.isBusFolder && !isToada && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  useSequencerStore.getState().handleToggleFoldBus(String(track.id));
                }}
                className="ml-1 flex items-center justify-center w-[22px] h-[22px] cordel-border-sm cordel-button text-[10px] cursor-pointer transition-colors bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold text-xs"
                title={track.isFolded ? (lang === 'fr' ? 'Déplier' : 'Desdobrar') : (lang === 'fr' ? 'Plier' : 'Dobrar')}
              >
                {track.isFolded ? '▼' : '▶'}
              </button>
            )}

            {instDropdownOpen && (
              <div className="absolute top-7 left-0 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-shadow min-w-[180px] max-h-[220px] overflow-y-auto z-[99]">
                {instrumentsConfig.map((opt, oIdx) => (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onInstrumentChange(oIdx);
                      setInstDropdownOpen(false);
                    }}
                    className="flex items-center gap-3.5 px-3 py-2 cursor-pointer text-xs font-bold border-b border-[var(--cordel-border)]/30 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
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
                <div
                  onClick={() => {
                    onDelete();
                    setInstDropdownOpen(false);
                  }}
                  className="flex items-center gap-3.5 px-3 py-2 cursor-pointer text-xs font-bold text-[#8b2a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8]"
                >
                  <span className="w-5 text-center">✕</span>
                  <span>{lang === 'fr' ? 'Supprimer la piste' : lang === 'pt' ? 'Excluir pista' : 'Delete track'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1.5">
          <button 
            onClick={(e) => { e.stopPropagation(); onMuteToggle(); }} 
            className={`w-6 h-6 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
              (track.isMute && !track.isSolo) ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >M</button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSoloToggle(); }} 
            className={`w-6 h-6 cordel-border-sm cordel-button font-bold text-xs flex items-center justify-center transition-all ${
              track.isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >S</button>
          
          {inst.id !== 'apito' && (
            <button
              onClick={toggleAoVivo}
              className={`w-6 h-6 cordel-border-sm cordel-button font-bold cursor-pointer transition-all flex items-center justify-center ${
                isAoVivo ? 'bg-[#27ae60] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
              }`}
              title={inst.type === 'voice' ? (lang === 'fr' ? 'Karaoké (Live)' : 'Karaokê (Ao Vivo)') : "Ao Vivo (Live POV)"}
            >
              {inst.type === 'voice' ? (
                <span className="text-xs leading-none">🎤</span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M11 22 L5 6" />
                  <circle cx="4" cy="3" r="2.5" fill="currentColor" />
                  <path d="M13 22 L19 6" />
                  <circle cx="20" cy="3" r="2.5" fill="currentColor" />
                </svg>
              )}
            </button>
          )}

          {inst.id !== 'apito' && (
            <button
              onClick={onHideToggle}
              className={`w-6 h-6 cordel-border-sm cordel-button text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center ${
                track.isHidden ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
              }`}
              title="Ocultar pista"
            >
              {track.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}

          {inst.id === 'apito' && (
            <>
              <div className="w-6 h-6 pointer-events-none"></div>
              <div className="w-6 h-6 pointer-events-none"></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const TrackMixer = React.memo(TrackMixerComponent, (prevProps, nextProps) => {
  if (prevProps.trackId !== nextProps.trackId) {
    return false;
  }

  const keys = Object.keys(prevProps) as Array<keyof TrackMixerProps>;
  for (const key of keys) {
    if (typeof prevProps[key] === 'function') continue;
    if (key === 'trackId') continue;
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  return true;
});
