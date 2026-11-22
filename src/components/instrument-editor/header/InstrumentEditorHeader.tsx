import React from 'react';
import { Play, Square, X, Mic, Users, SlidersHorizontal, Maximize2, Minimize2 } from 'lucide-react';
import { PupitreRibbon } from './PupitreRibbon';
import { HeaderBalancoControl } from './HeaderBalancoControl';
import { SectionSquadTriggerBadge } from '../../mixer/spatial/SectionSquadTriggerBadge';
import { InstrumentEditorHeaderProps } from './headerTypes';
import { getInstrumentPrimaryStrongColor, getContrastColor } from '../../../utils/colorHelpers';

export type { InstrumentEditorHeaderProps };

export const InstrumentEditorHeader: React.FC<InstrumentEditorHeaderProps & { activeTool?: string }> = React.memo((props) => {
  const {
    inst, trackDisplayName, isVocalContext, puxTrack, coroTrack, isCoroActive,
    onSwitchVocalTrack, visibleTrackIds, activeTrackId, onSelectTrack, onContextMenu,
    addBtnRef, isAddPickerOpen, onToggleAddPicker, targetBalancoTrack, effectiveEditTrackId,
    balancoPresets, handleTrackBalancoChange, isPatternRecording, togglePatternRecording,
    isMute, isSolo, onMuteToggle, onSoloToggle, onClose, isClosing, lang,
    selectedPatternId, activePatternId, onToggleSoloLoop, isSoloLoopPlaying, activeTool, hideCloseButton,
    isMaximized = false, onToggleMaximized, showMaximizeButton = false,
  } = props;

  const headerBg = getInstrumentPrimaryStrongColor(inst, targetBalancoTrack);
  const headerText = getContrastColor(headerBg);
  const resolvedTrackLabel = isVocalContext ? (isCoroActive ? 'Coro' : 'Puxador') : trackDisplayName;

  return (
    <div
      className="xilo-wood-stamp flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 border-b-[3px] border-[var(--cordel-ink-dark)] shrink-0 relative z-10"
      style={{ backgroundColor: headerBg, color: headerText }}
    >
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-2">
        <div className="w-[150px] min-w-[150px] shrink-0 flex-shrink-0 flex items-center">
          {isVocalContext && puxTrack && coroTrack ? (
            <div className="w-full flex items-stretch h-7 rounded border-2 border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] overflow-hidden bg-[var(--cordel-parchment-bg)] select-none shrink-0 flex-shrink-0">
              <button
                type="button"
                onClick={() => onSwitchVocalTrack?.(puxTrack)}
                className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold font-cactus tracking-wide transition-colors cursor-pointer shrink-0 ${!isCoroActive ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-ink-dark)]/10'}`}
                title={lang === 'fr' ? 'Éditer le Puxador (Solo) [Tab]' : 'Editar o Puxador (Solo) [Tab]'}
              >
                <Mic size={11} />
                <span className="truncate">Puxador</span>
              </button>
              <div className="w-[1px] bg-[var(--cordel-ink-dark)] shrink-0" />
              <button
                type="button"
                onClick={() => onSwitchVocalTrack?.(coroTrack)}
                className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold font-cactus tracking-wide transition-colors cursor-pointer shrink-0 ${isCoroActive ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-ink-dark)]/10'}`}
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
          visibleTrackIds={visibleTrackIds} activeTrackId={activeTrackId} onSelectTrack={onSelectTrack}
          onContextMenu={onContextMenu} addBtnRef={addBtnRef} isAddPickerOpen={isAddPickerOpen}
          onToggleAddPicker={onToggleAddPicker} lang={lang}
        />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto pr-1">
        {props.onOpenInspectorMobile && (
          <button
            type="button" onClick={props.onOpenInspectorMobile}
            className="lg:hidden h-8 px-2 rounded-sm cordel-border-sm text-xs font-bold cursor-pointer transition-all flex items-center gap-1 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] shrink-0"
            title={lang === 'fr' ? 'Son & Accordage' : 'Som & Afinação'}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">{lang === 'fr' ? 'Son' : 'Som'}</span>
          </button>
        )}
        {!isVocalContext && activeTrackId !== undefined && activeTrackId !== null && (
          <SectionSquadTriggerBadge trackId={Number(activeTrackId)} />
        )}
        <HeaderBalancoControl
          targetBalancoTrack={targetBalancoTrack} effectiveEditTrackId={effectiveEditTrackId}
          balancoPresets={balancoPresets} handleTrackBalancoChange={handleTrackBalancoChange}
          lang={lang} trackLabel={resolvedTrackLabel} selectedPatternId={selectedPatternId}
          activePatternId={activePatternId} activeTool={activeTool}
        />
        {onToggleSoloLoop && (
          <button
            type="button" onClick={() => onToggleSoloLoop?.()}
            className={`h-8 px-2.5 rounded-sm cordel-border-sm text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 flex-shrink-0 ${isSoloLoopPlaying ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'}`}
            title={lang === 'fr' ? 'Boucle locale' : 'Loop local'}
          >
            {isSoloLoopPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>
        )}
        {!isVocalContext && (
          <button
            type="button" onClick={() => togglePatternRecording?.()}
            className={`h-8 px-2.5 rounded-sm cordel-border-sm text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 flex-shrink-0 ${isPatternRecording ? 'bg-[var(--cordel-status-danger)] text-[var(--cordel-on-accent)] cordel-arm-pulse animate-pulse shadow-md' : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-ink-dark)] hover:text-[var(--cordel-on-accent)] border border-[var(--cordel-ink-dark)]'}`}
            title={lang === 'fr' ? 'Enregistrement MIDI (R)' : 'Gravação MIDI (R)'}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${isPatternRecording ? 'bg-[var(--cordel-on-accent)] animate-ping' : 'bg-[var(--cordel-wood)]'}`} />
            <span>REC (R)</span>
          </button>
        )}
        <button type="button" onClick={() => onMuteToggle?.()} className={`w-8 h-8 cordel-border-sm cordel-button text-xs font-bold cursor-pointer transition-all flex items-center justify-center shrink-0 flex-shrink-0 ${isMute && !isSolo ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'}`} title="Mute">M</button>
        <button type="button" onClick={() => onSoloToggle?.()} className={`w-8 h-8 cordel-border-sm cordel-button text-xs font-bold cursor-pointer transition-all flex items-center justify-center shrink-0 flex-shrink-0 ${isSolo ? 'bg-[var(--cordel-gold)] text-[var(--cordel-ink-dark)]' : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-gold)] hover:text-[var(--cordel-ink-dark)]'}`} title="Solo">S</button>
        {showMaximizeButton && onToggleMaximized && (
          <button
            type="button" data-testid="editor-toggle-fullscreen" data-tour-id="editor-fullscreen-btn" onClick={onToggleMaximized}
            className={`w-8 h-8 cordel-border-sm cordel-button text-xs font-bold cursor-pointer transition-all flex items-center justify-center shrink-0 flex-shrink-0 ${isMaximized ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'}`}
            title={lang === 'fr' ? (isMaximized ? 'Quitter le plein écran' : 'Plein écran') : (isMaximized ? 'Sair da tela cheia' : 'Tela cheia')}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}
        {!hideCloseButton && (
          <button type="button" onClick={() => onClose?.()} disabled={isClosing} className="w-9 h-9 shrink-0 flex items-center justify-center bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] cordel-border-sm cordel-button font-bold text-sm hover:bg-[var(--cordel-wood)] cursor-pointer transition-colors ml-1 border border-[var(--cordel-on-accent)]" title={lang === 'fr' ? 'Fermer' : 'Fechar'}>
            {isClosing ? '...' : <X className="w-5 h-5 text-[var(--cordel-on-accent)] stroke-[2.5]" />}
          </button>
        )}
      </div>
    </div>
  );
});

InstrumentEditorHeader.displayName = 'InstrumentEditorHeader';
