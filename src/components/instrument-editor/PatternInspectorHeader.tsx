/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useSequencer } from '../../contexts/SequencerContext';
import { Trash2, Plus } from 'lucide-react';
import { BalancoPresetItem, PatternInspectorHeaderProps } from './inspector/inspectorTypes';
import { PatternInspectorActions } from './inspector/PatternInspectorActions';
import { PatternInspectorBalancoControl } from './inspector/PatternInspectorBalancoControl';

export type { BalancoPresetItem, PatternInspectorHeaderProps };

export const PatternInspectorHeader: React.FC<PatternInspectorHeaderProps> = React.memo((props) => {
  const {
    patterns = [], currentPatternId, trackId, lang, canPaste, balancoPresets = [],
    isVoice = false, onSelectPattern, onAddPattern, onCopyPattern, onPastePattern,
    onSavePattern, onLoadPattern, onDeletePattern, onBalancoChange,
  } = props;

  const isFr = lang === 'fr';
  const sequencer = useSequencer();

  const activePattern = useMemo(() => {
    return patterns.find((p) => p.id === currentPatternId) || patterns[0];
  }, [patterns, currentPatternId]);

  const handlePatternChange = (newId: number) => {
    onSelectPattern?.(newId);
    setTimeout(() => {
      const el = document.querySelector(`[data-pattern-id="${newId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleDelete = async () => {
    if (!activePattern || patterns.length <= 1) return;
    const patternName = activePattern.name || `${isFr ? 'Motif' : 'Padrão'} ${patterns.findIndex((p) => p.id === activePattern.id) + 1}`;
    const confirmMessage = isFr
      ? `Voulez-vous vraiment supprimer le motif "${patternName}" ?`
      : `Deseja realmente excluir o padrão "${patternName}"?`;

    const ok = await sequencer.confirmAsync(confirmMessage);
    if (!ok) return;

    const remaining = patterns.filter((p) => p.id !== activePattern.id);
    const fallbackId = remaining[0]?.id || 0;
    onDeletePattern?.(activePattern.id);
    if (fallbackId) handlePatternChange(fallbackId);
  };

  const currentBalancoAmount = activePattern?.balancoAmount !== undefined
    ? activePattern.balancoAmount
    : (activePattern?.swingIntensity !== undefined ? activePattern.swingIntensity : 100);

  return (
    <div className="flex flex-col gap-2.5 pb-2.5 border-b-2 border-[#1a1a1a]/20">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/70 select-none">
          {isFr ? 'Motif actif' : 'Padrão ativo'}
        </label>
        <div className="flex items-center gap-1.5 w-full">
          <select
            value={activePattern?.id || currentPatternId}
            onChange={(e) => handlePatternChange(Number(e.target.value))}
            style={{ colorScheme: 'light' }}
            className="flex-1 min-w-0 bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] px-2 py-1 text-xs font-bold font-cactus rounded shadow-[1px_1px_0px_#1a1a1a] outline-none cursor-pointer truncate"
            title={isFr ? 'Changer de motif et défiler vers sa carte' : 'Trocar de padrão e rolar até seu cartão'}
          >
            {patterns.map((p, idx) => (
              <option key={p.id} value={p.id}>{p.name ? p.name : `${isFr ? 'Motif' : 'Padrão'} ${idx + 1}`}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={onAddPattern}
            className="w-7 h-7 flex items-center justify-center bg-[#8b2a1a] text-[#f4ecd8] border border-[#1a1a1a] rounded shadow-[1px_1px_0px_#1a1a1a] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
            title={isFr ? 'Ajouter un nouveau motif vierge' : 'Adicionar um novo padrão em branco'}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <PatternInspectorActions
        isFr={isFr} activePattern={activePattern} canPaste={canPaste}
        onCopyPattern={onCopyPattern ? () => onCopyPattern(activePattern) : undefined}
        onPastePattern={onPastePattern && activePattern ? () => onPastePattern(activePattern.id) : undefined}
        onSavePattern={onSavePattern && activePattern ? () => onSavePattern(activePattern.id) : undefined}
        onLoadPattern={onLoadPattern && activePattern ? () => onLoadPattern(activePattern.id) : undefined}
      />

      {activePattern && (
        <PatternInspectorBalancoControl
          activePattern={activePattern} trackId={trackId} isFr={isFr} isVoice={isVoice}
          balancoPresets={balancoPresets} currentBalancoAmount={currentBalancoAmount}
          onBalancoChange={onBalancoChange}
        />
      )}

      {patterns.length > 1 && (
        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center justify-center gap-1.5 w-full py-1 text-xs font-bold font-cactus bg-[#f4ecd8] text-[#8b2a1a] border border-[#8b2a1a]/40 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] rounded shadow-[1px_1px_0px_#1a1a1a] transition-colors cursor-pointer"
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
