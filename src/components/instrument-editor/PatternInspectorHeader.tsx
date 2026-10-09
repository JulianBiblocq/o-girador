/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useSequencer } from '../../contexts/SequencerContext';
import { Copy, Download, CloudUpload, FolderOpen, Trash2, Plus } from 'lucide-react';

export interface BalancoPresetItem {
  id: string;
  name: string;
}

export interface PatternInspectorHeaderProps {
  patterns: Array<{
    id: number;
    name?: string;
    balancoPresetId?: string;
    balancoAmount?: number;
    swingIntensity?: number;
    [key: string]: any;
  }>;
  selectedPatternId: number;
  trackId: number;
  lang: string;
  canPaste: boolean;
  balancoPresets?: BalancoPresetItem[];
  isVoice?: boolean;
  onSelectPattern: (patternId: number) => void;
  onAddPattern: () => void;
  onCopyPattern?: () => void;
  onPastePattern?: () => void;
  onSavePattern?: () => void;
  onLoadPattern?: () => void;
  onDeletePattern?: (patternId: number) => void;
  onBalancoChange?: (trackId: number, patternId: number, presetId: string | undefined, amount: number) => void;
}

export const PatternInspectorHeader: React.FC<PatternInspectorHeaderProps> = React.memo(({
  patterns = [],
  selectedPatternId,
  trackId,
  lang,
  canPaste,
  balancoPresets = [],
  isVoice = false,
  onSelectPattern,
  onAddPattern,
  onCopyPattern,
  onPastePattern,
  onSavePattern,
  onLoadPattern,
  onDeletePattern,
  onBalancoChange,
}) => {
  const isFr = lang === 'fr';
  const sequencer = useSequencer();

  const activePattern = useMemo(() => {
    return patterns.find((p) => p.id === selectedPatternId) || patterns[0];
  }, [patterns, selectedPatternId]);

  const handlePatternChange = (newId: number) => {
    onSelectPattern(newId);
    // Défilement doux vers la carte centrale ciblée sans forcer de recalcul lourd
    setTimeout(() => {
      const el = document.querySelector(`[data-pattern-id="${newId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  };

  const handleDelete = async () => {
    if (!activePattern || patterns.length <= 1) return;
    const patternName = activePattern.name || `${isFr ? 'Motif' : 'Padrão'} ${patterns.findIndex((p) => p.id === activePattern.id) + 1}`;
    const confirmMessage = isFr
      ? `Voulez-vous vraiment supprimer le motif "${patternName}" ?`
      : `Deseja realmente excluir o padrão "${patternName}"?`;

    // Utilisation obligatoire de la confirmation Cordel asynchrone
    const ok = await sequencer.confirmAsync(confirmMessage);
    if (!ok) return;

    const remaining = patterns.filter((p) => p.id !== activePattern.id);
    const fallbackId = remaining[0]?.id || 0;

    if (onDeletePattern) {
      onDeletePattern(activePattern.id);
    }
    if (fallbackId) {
      handlePatternChange(fallbackId);
    }
  };

  const currentBalancoAmount = activePattern?.balancoAmount !== undefined
    ? activePattern.balancoAmount
    : (activePattern?.swingIntensity !== undefined ? activePattern.swingIntensity : 100);

  return (
    <div className="flex flex-col gap-2.5 pb-2.5 border-b-2 border-[#1a1a1a]/20">
      {/* ─── 1. Sélecteur de motif déroulant & Bouton [+] ─── */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/70 select-none">
          {isFr ? 'Motif actif' : 'Padrão ativo'}
        </label>
        <div className="flex items-center gap-1.5 w-full">
          <select
            value={activePattern?.id || selectedPatternId}
            onChange={(e) => handlePatternChange(Number(e.target.value))}
            style={{ colorScheme: 'light' }}
            className="flex-1 min-w-0 bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] px-2 py-1 text-xs font-bold font-cactus rounded shadow-[1px_1px_0px_#1a1a1a] outline-none cursor-pointer truncate"
            title={isFr ? "Changer de motif et défiler vers sa carte" : "Trocar de padrão e rolar até seu cartão"}
          >
            {patterns.map((p, idx) => (
              <option key={p.id} value={p.id}>
                {p.name ? p.name : `${isFr ? 'Motif' : 'Padrão'} ${idx + 1}`}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onAddPattern}
            className="w-7 h-7 flex items-center justify-center bg-[#8b2a1a] text-[#f4ecd8] border border-[#1a1a1a] rounded shadow-[1px_1px_0px_#1a1a1a] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
            title={isFr ? "Ajouter un nouveau motif vierge" : "Adicionar um novo padrão em branco"}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ─── 2. Barre d'actions transversales sur le motif ─── */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Copier */}
        <button
          type="button"
          onClick={onCopyPattern}
          disabled={!activePattern}
          className="flex items-center justify-center gap-1.5 px-2 py-1 bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] text-[11px] font-bold font-cactus rounded shadow-[1px_1px_0px_#1a1a1a] hover:bg-black/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title={isFr ? 'Copier ce motif' : 'Copiar este padrão'}
        >
          <Copy size={12} />
          <span>{isFr ? 'Copier' : 'Copiar'}</span>
        </button>

        {/* Coller */}
        <button
          type="button"
          onClick={onPastePattern}
          disabled={!canPaste || !activePattern}
          className={`flex items-center justify-center gap-1.5 px-2 py-1 text-[11px] font-bold font-cactus rounded shadow-[1px_1px_0px_#1a1a1a] border transition-all ${
            canPaste
              ? 'bg-[#f4ecd8] text-[#1a1a1a] border-[#1a1a1a] hover:bg-black/10 active:scale-95 cursor-pointer'
              : 'bg-stone-300 text-stone-500 border-[#1a1a1a]/30 cursor-not-allowed opacity-50'
          }`}
          title={isFr ? 'Coller le motif copié' : 'Colar o padrão copiado'}
        >
          <Download size={12} />
          <span>{isFr ? 'Coller' : 'Colar'}</span>
        </button>

        {/* Sauvegarder dans le Cloud / Catalogue */}
        <button
          type="button"
          onClick={onSavePattern}
          disabled={!activePattern}
          className="flex items-center justify-center gap-1.5 px-2 py-1 bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] text-[11px] font-bold font-cactus rounded shadow-[1px_1px_0px_#1a1a1a] hover:bg-black/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title={isFr ? 'Sauvegarder ce motif dans le catalogue cloud' : 'Salvar este padrão no catálogo nuvem'}
        >
          <CloudUpload size={12} />
          <span>{isFr ? 'Sauvegarder' : 'Salvar'}</span>
        </button>

        {/* Charger depuis le Catalogue */}
        <button
          type="button"
          onClick={onLoadPattern}
          disabled={!activePattern}
          className="flex items-center justify-center gap-1.5 px-2 py-1 bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] text-[11px] font-bold font-cactus rounded shadow-[1px_1px_0px_#1a1a1a] hover:bg-black/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title={isFr ? 'Charger un motif depuis le catalogue' : 'Carregar padrão do catálogo'}
        >
          <FolderOpen size={12} />
          <span>{isFr ? 'Charger' : 'Carregar'}</span>
        </button>
      </div>

      {/* ─── 3. Balanço / Héritage Preset & Dosage local ─── */}
      {activePattern && (
        isVoice ? (
          <details className="group bg-[#f4ecd8]/60 p-1.5 border border-[#1a1a1a]/30 rounded shadow-xs select-none">
            <summary className="text-[10px] font-bold uppercase tracking-wider cursor-pointer list-none flex items-center justify-between text-[#1a1a1a]/70 hover:text-[#1a1a1a] select-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-1">
                <span>⚖️</span>
                <span>{isFr ? 'Balanço / Swing' : 'Balanço / Swing'}</span>
                <span className="font-mono text-[#8b2a1a]">({currentBalancoAmount}%)</span>
              </span>
              <span className="text-[9px] transition-transform group-open:rotate-90">▸</span>
            </summary>
            <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-[#1a1a1a]/15">
              <select
                value={activePattern.balancoPresetId || ''}
                onChange={(e) => {
                  const val = e.target.value || undefined;
                  if (onBalancoChange && activePattern) {
                    onBalancoChange(trackId, activePattern.id, val, currentBalancoAmount);
                  }
                }}
                style={{ colorScheme: 'light' }}
                className="flex-1 min-w-0 bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] px-1 py-0.5 text-[10px] font-bold rounded shadow-[1px_1px_0px_#1a1a1a] outline-none cursor-pointer truncate"
                title={isFr ? "Héritage du preset de balanço" : "Herança do preset de balanço"}
              >
                <option value="">
                  {isFr ? "Hériter de l'instrument" : 'Herdar do instrumento'}
                </option>
                {balancoPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <input
                type="range"
                min="0"
                max="100"
                value={currentBalancoAmount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (onBalancoChange && activePattern) {
                    onBalancoChange(trackId, activePattern.id, activePattern.balancoPresetId, val);
                  }
                }}
                className="w-16 h-1.5 bg-[#1a1a1a]/20 rounded-full appearance-none cursor-pointer outline-none accent-[#8b2a1a]"
                title={isFr ? "Dosage local du balanço pour ce motif" : "Dosagem local do balanço para este padrão"}
              />
            </div>
          </details>
        ) : (
          <div className="flex flex-col gap-1 bg-[#f4ecd8]/60 p-2 border border-[#1a1a1a]/30 rounded shadow-xs select-none">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#1a1a1a]">
              <span className="flex items-center gap-1">
                <span>⚖️</span>
                <span>{isFr ? 'Balanço / Swing' : 'Balanço / Swing'}</span>
              </span>
              <span className="font-mono text-[10px] text-[#8b2a1a] font-bold">
                {currentBalancoAmount}%
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <select
                value={activePattern.balancoPresetId || ''}
                onChange={(e) => {
                  const val = e.target.value || undefined;
                  if (onBalancoChange && activePattern) {
                    onBalancoChange(trackId, activePattern.id, val, currentBalancoAmount);
                  }
                }}
                style={{ colorScheme: 'light' }}
                className="flex-1 min-w-0 bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] px-1 py-0.5 text-[10px] font-bold rounded shadow-[1px_1px_0px_#1a1a1a] outline-none cursor-pointer truncate"
                title={isFr ? "Héritage du preset de balanço" : "Herança do preset de balanço"}
              >
                <option value="">
                  {isFr ? "Hériter de l'instrument" : 'Herdar do instrumento'}
                </option>
                {balancoPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <input
                type="range"
                min="0"
                max="100"
                value={currentBalancoAmount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (onBalancoChange && activePattern) {
                    onBalancoChange(trackId, activePattern.id, activePattern.balancoPresetId, val);
                  }
                }}
                className="w-16 h-1.5 bg-[#1a1a1a]/20 rounded-full appearance-none cursor-pointer outline-none accent-[#8b2a1a]"
                title={isFr ? "Dosage local du balanço pour ce motif" : "Dosagem local do balanço para este padrão"}
              />
            </div>
          </div>
        )
      )}

      {/* ─── 4. Bouton de suppression du motif ─── */}
      {patterns.length > 1 && (
        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center justify-center gap-1.5 w-full py-1 text-xs font-bold font-cactus bg-[#f4ecd8] text-[#8b2a1a] border border-[#8b2a1a]/40 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] rounded shadow-[1px_1px_0px_#1a1a1a] transition-colors cursor-pointer"
          title={isFr ? "Supprimer ce motif de la piste" : "Excluir este padrão da faixa"}
        >
          <Trash2 size={12} />
          <span>{isFr ? 'Supprimer ce motif' : 'Excluir este padrão'}</span>
        </button>
      )}
    </div>
  );
});

PatternInspectorHeader.displayName = 'PatternInspectorHeader';
