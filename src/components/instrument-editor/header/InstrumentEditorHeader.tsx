
import React from 'react';
import { Play, Square, X, Mic, Users } from 'lucide-react';
import { PupitreRibbon } from './PupitreRibbon';
import { HeaderBalancoControl } from './HeaderBalancoControl';
import { InstrumentEditorHeaderProps } from './headerTypes';

export type { InstrumentEditorHeaderProps };

export const InstrumentEditorHeader: React.FC<InstrumentEditorHeaderProps> = React.memo((props) => {
  const {
    inst, trackDisplayName, isVocalContext, puxTrack, coroTrack, isCoroActive,
    onSwitchVocalTrack, visibleTrackIds, activeTrackId, onSelectTrack, onContextMenu,
    addBtnRef, isAddPickerOpen, onToggleAddPicker, targetBalancoTrack, effectiveEditTrackId,
    balancoPresets, handleTrackBalancoChange, isPatternRecording, togglePatternRecording,
    isMute, isSolo, onMuteToggle, onSoloToggle, onClose, isClosing, lang,
    selectedPatternId, activePatternId, onToggleSoloLoop, isSoloLoopPlaying,
  } = props;

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 border-b-[3px] border-[#1a1a1a] shrink-0 relative z-10"
      style={{ backgroundColor: inst.mixerBg, color: inst.colors?.text }}
    >
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-2">
        <div className="w-[150px] min-w-[150px] shrink-0 flex-shrink-0 flex items-center">
          {isVocalContext && puxTrack && coroTrack ? (
            <div className="w-full flex items-stretch h-7 rounded border-2 border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] overflow-hidden bg-[#f4ecd8] select-none shrink-0 flex-shrink-0">
              <button
                type="button"
                onClick={() => onSwitchVocalTrack(puxTrack)}
                className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold font-cactus tracking-wide transition-colors cursor-pointer shrink-0 ${!isCoroActive ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'}`}
                title={lang === 'fr' ? 'Éditer le Puxador (Solo) [Tab]' : 'Editar o Puxador (Solo) [Tab]'}
              >
                <Mic size={11} />
                <span className="truncate">Puxador</span>
              </button>
              <div className="w-[1px] bg-[#1a1a1a] shrink-0" />
              <button
                type="button"
                onClick={() => onSwitchVocalTrack(coroTrack)}
                className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold font-cactus tracking-wide transition-colors cursor-pointer shrink-0 ${isCoroActive ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'}`}
                title={lang === 'fr' ? 'Éditer le Coro (Chœur) [Tab]' : 'Editar o Coro (Coro) [Tab]'}
              >
                <Users size={11} />
                <span className="truncate">Coro</span>
              </button>
            </div>
          ) : (
            <span className="font-cactus font-bold text-lg tracking-wide truncate" title={trackDisplayName}>
              {trackDisplayName}
            </span>
          )}
        </div>
        <PupitreRibbon
          visibleTrackIds={visibleTrackIds}
          activeTrackId={activeTrackId}
          onSelectTrack={onSelectTrack}
          onContextMenu={onContextMenu}
          addBtnRef={addBtnRef}
          isAddPickerOpen={isAddPickerOpen}
          onToggleAddPicker={onToggleAddPicker}
          lang={lang}
        />
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2 pr-1">
        <HeaderBalancoControl
          targetBalancoTrack={targetBalancoTrack}
          effectiveEditTrackId={effectiveEditTrackId}
          balancoPresets={balancoPresets}
          handleTrackBalancoChange={handleTrackBalancoChange}
          lang={lang}
        />
        {onToggleSoloLoop && (
          <button
            type="button"
            onClick={onToggleSoloLoop}
            className={`h-8 px-2.5 rounded-sm cordel-border-sm text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 flex-shrink-0 ${isSoloLoopPlaying ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8]'}`}
            title={lang === 'fr' ? 'Boucle locale' : 'Loop local'}
          >
            {isSoloLoopPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>
        )}
        {!isVocalContext && (
          <button
            type="button"
            onClick={togglePatternRecording}
            className={`h-8 px-2.5 rounded-sm cordel-border-sm text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 flex-shrink-0 ${isPatternRecording ? 'bg-[#e74c3c] text-white cordel-arm-pulse animate-pulse shadow-md' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8] border border-[#1a1a1a]'}`}
            title={lang === 'fr' ? "Enregistrement MIDI (R)" : "Gravação MIDI (R)"}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${isPatternRecording ? 'bg-white animate-ping' : 'bg-[#8b2a1a]'}`} />
            <span>REC (R)</span>
          </button>
        )}
        <button type="button" onClick={onMuteToggle} className={`w-8 h-8 cordel-border-sm cordel-button text-xs font-bold cursor-pointer transition-all flex items-center justify-center shrink-0 flex-shrink-0 ${isMute && !isSolo ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8]'}`} title="Mute">M</button>
        <button type="button" onClick={onSoloToggle} className={`w-8 h-8 cordel-border-sm cordel-button text-xs font-bold cursor-pointer transition-all flex items-center justify-center shrink-0 flex-shrink-0 ${isSolo ? 'bg-[#d4af37] text-[#1a1a1a]' : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#d4af37] hover:text-[#1a1a1a]'}`} title="Solo">S</button>
        <button type="button" onClick={onClose} disabled={isClosing} className="w-8 h-8 shrink-0 flex items-center justify-center bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold text-sm hover:bg-[#1a1a1a] cursor-pointer transition-colors ml-1" title={lang === 'fr' ? 'Fermer' : 'Fechar'}>
          {isClosing ? '...' : <X className="w-5 h-5 text-[#f4ecd8] stroke-[2.5]" />}
        </button>
      </div>
    </div>
  );
});

InstrumentEditorHeader.displayName = 'InstrumentEditorHeader';
