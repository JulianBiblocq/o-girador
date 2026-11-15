import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { useSequencer } from '../../contexts/SequencerContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Trash2, Plus } from 'lucide-react';
import { PatternInspectorHeaderProps } from './inspector/inspectorTypes';
import { PatternInspectorActions } from './inspector/PatternInspectorActions';
import { PatternInspectorBalancoControl } from './inspector/PatternInspectorBalancoControl';

export type { PatternInspectorHeaderProps };

export const PatternInspectorHeader: React.FC<PatternInspectorHeaderProps & { activeTool?: string }> = React.memo((props) => {
  const {
    patterns = [], currentPatternId, trackId, lang, canPaste, balancoPresets = [],
    isVoice = false, isExpandedLayout = false, instrumentName, activeTool, onSelectPattern, onAddPattern,
    onCopyPattern, onPastePattern, onSavePattern, onLoadPattern, onDeletePattern, onBalancoChange,
  } = props;

  const isFr = lang === 'fr';
  const sequencer = useSequencer();
  const track = useSequencerStore(useCallback((s) => s.tracks.find((t) => t.id === trackId), [trackId]));
  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
  }, []);

  const activePattern = useMemo(() => patterns.find((p) => p.id === currentPatternId) ?? patterns[0], [patterns, currentPatternId]);
  const activePatternIdx = useMemo(() => (activePattern ? patterns.findIndex((p) => p.id === activePattern.id) : -1), [patterns, activePattern]);
  const activePatternLabel = activePattern ? (activePattern.name || `${isFr ? 'Motif' : 'Padrão'} ${activePatternIdx + 1}`) : undefined;

  const handlePatternChange = useCallback((newId: number) => {
    onSelectPattern?.(newId);
    if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = document.querySelector(`[data-pattern-id="${newId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [onSelectPattern]);

  const handleDelete = async () => {
    if (!activePattern || patterns.length <= 1) return;
    const patternName = activePatternLabel || `${isFr ? 'Motif' : 'Padrão'} 1`;
    const msg = isFr ? `Voulez-vous vraiment supprimer le motif "${patternName}" ?` : `Deseja realmente excluir o padrão "${patternName}"?`;
    if (!(await sequencer.confirmAsync(msg))) return;
    const remaining = patterns.filter((p) => p.id !== activePattern.id);
    const nextId = remaining[0]?.id;
    onDeletePattern?.(activePattern.id);
    if (nextId !== undefined && nextId !== null) handlePatternChange(nextId);
  };

  const isInherited = !activePattern?.balancoPresetId;
  const trackBalancoAmount = track?.balancoAmount ?? track?.swingIntensity ?? 100;
  const currentBalancoAmount = isInherited ? trackBalancoAmount : (activePattern?.balancoAmount ?? activePattern?.swingIntensity ?? 100);

  const handleBalancoChangeWrapped = useCallback((tId: number, pId: number, presetId: string | undefined, amount: number) => {
    onBalancoChange?.(tId, pId, presetId, amount);
    if (!presetId) useSequencerStore.getState().handleTrackBalancoChange(tId, track?.balancoPresetId || 'maracatu-trad', amount);
  }, [onBalancoChange, track?.balancoPresetId]);

  return (
    <div className="flex flex-col gap-2.5 pb-2.5 border-b-2 border-[var(--cordel-ink-dark)]/20 w-full min-w-0 box-border">
      <div className="flex flex-col gap-1 w-full min-w-0 box-border">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-ink-dark)]/70 select-none">
          {isFr ? 'Motif actif' : 'Padrão ativo'}
        </label>
        <div className="flex items-center gap-2 w-full min-w-0 box-border">
          <select
            value={activePattern?.id ?? currentPatternId ?? 0}
            onChange={(e) => handlePatternChange(Number(e.target.value))}
            style={{ colorScheme: 'light' }}
            className="flex-1 min-w-0 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border border-[var(--cordel-ink-dark)] px-2 py-1 text-xs font-bold font-cactus rounded shadow-[1px_1px_0px_var(--cordel-ink-dark)] outline-none cursor-pointer truncate"
            title={isFr ? 'Changer de motif et défiler vers sa carte' : 'Trocar de padrão e rolar até seu cartão'}
          >
            {patterns.map((p, idx) => (
              <option key={p.id} value={p.id}>{p.name ? p.name : `${isFr ? 'Motif' : 'Padrão'} ${idx + 1}`}</option>
            ))}
          </select>
          <button
            type="button" onClick={onAddPattern}
            className="w-7 h-7 flex items-center justify-center bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border border-[var(--cordel-ink-dark)] rounded shadow-[1px_1px_0px_var(--cordel-ink-dark)] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
            title={isFr ? 'Ajouter un nouveau motif vierge' : 'Adicionar um novo padrão em branco'}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <PatternInspectorActions
        isFr={isFr} activePattern={activePattern} canPaste={canPaste} isVoice={isVoice}
        onCopyPattern={onCopyPattern ? () => onCopyPattern(activePattern) : undefined}
        onPastePattern={onPastePattern && activePattern ? () => onPastePattern(activePattern.id) : undefined}
        onSavePattern={onSavePattern && activePattern ? () => onSavePattern(activePattern.id) : undefined}
        onLoadPattern={onLoadPattern && activePattern ? () => onLoadPattern(activePattern.id) : undefined}
      />

      {activePattern && (
        <PatternInspectorBalancoControl
          activePattern={activePattern} trackId={trackId} isFr={isFr} isVoice={isVoice}
          defaultExpanded={isExpandedLayout} balancoPresets={balancoPresets} currentBalancoAmount={currentBalancoAmount}
          instrumentName={instrumentName} patternLabel={activePatternLabel} activeTool={activeTool}
          onBalancoChange={handleBalancoChangeWrapped}
        />
      )}

      {patterns.length > 1 && (
        <button
          type="button" onClick={handleDelete}
          className="flex items-center justify-center gap-1.5 w-full py-1 text-xs font-bold font-cactus bg-[var(--cordel-parchment-bg)] text-[var(--cordel-accent-readable)] border border-[var(--cordel-wood)]/40 hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] rounded shadow-[1px_1px_0px_var(--cordel-ink-dark)] transition-colors cursor-pointer"
          title={isFr ? 'Supprimer ce motif de la piste' : 'Excluir este padrão da faixa'}
        >
          <Trash2 size={12} />
          <span>{isFr ? 'Supprimer ce motif' : 'Excluir este padrão'}</span>
        </button>
      )}
    </div>
  );
});

PatternInspectorHeader.displayName = 'PatternInspectorHeader';
