import React from 'react';
import { Check, Edit3, FastForward } from 'lucide-react';
import { SectionImportMode } from '../../types';
import { MissingSectionTrackInfo } from '../../utils/sections/sectionImportTrackMatcher';

interface LoadSectionOptionsPanelProps {
  lang: 'fr' | 'pt';
  mode: SectionImportMode;
  onModeChange: (mode: SectionImportMode) => void;
  createMissingTracks: boolean;
  onCreateMissingChange: (val: boolean) => void;
  missingTracks: MissingSectionTrackInfo[];
  matchedCount: number;
  insertAtMeasure: number;
}

export const LoadSectionOptionsPanel: React.FC<LoadSectionOptionsPanelProps> = ({
  lang,
  mode,
  onModeChange,
  createMissingTracks,
  onCreateMissingChange,
  missingTracks,
  matchedCount,
  insertAtMeasure,
}) => {
  const isFr = lang === 'fr';
  const missingCount = missingTracks.length;
  const missingSummary = missingTracks.map((m) => m.label).join(', ');

  return (
    <div className="mb-3 p-3 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] flex flex-col gap-2.5 text-[var(--cordel-text)]">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">
          {isFr ? `Mode à la mesure M.${insertAtMeasure + 1}` : `Modo no compasso C.${insertAtMeasure + 1}`}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onModeChange('insert')}
            className={`px-2.5 py-1 text-xs font-bold border-2 transition-colors cursor-pointer flex items-center gap-1 ${
              mode === 'insert'
                ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)]'
            }`}
          >
            <FastForward size={12} className="shrink-0" />
            <span>{isFr ? 'Insérer (décaler)' : 'Inserir (deslocar)'}</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange('overwrite')}
            className={`px-2.5 py-1 text-xs font-bold border-2 transition-colors cursor-pointer flex items-center gap-1 ${
              mode === 'overwrite'
                ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)]'
            }`}
          >
            <Edit3 size={12} className="shrink-0" />
            <span>{isFr ? 'Écraser (remplacer)' : 'Sobrescrever'}</span>
          </button>
        </div>
      </div>

      {missingCount > 0 && (
        <div className="pt-2 border-t border-[var(--cordel-border)]/25 flex flex-col gap-1">
          <button
            type="button"
            role="checkbox"
            aria-checked={createMissingTracks}
            onClick={() => onCreateMissingChange(!createMissingTracks)}
            className="flex items-start gap-2 text-left cursor-pointer group"
          >
            <span
              className={`mt-0.5 w-4 h-4 shrink-0 border-2 border-[var(--cordel-border)] flex items-center justify-center transition-colors ${
                createMissingTracks ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-bg)]'
              }`}
            >
              {createMissingTracks && <Check size={11} strokeWidth={3} />}
            </span>
            <span className="text-xs font-bold leading-snug">
              {isFr
                ? `Créer automatiquement les pistes manquantes (+${missingCount})`
                : `Criar automaticamente as faixas ausentes (+${missingCount})`}
            </span>
          </button>
          <span className="text-[11px] opacity-75 pl-6">
            {createMissingTracks
              ? (isFr ? `Ajoutées (silencieuses ailleurs) : ${missingSummary}` : `Adicionadas (silenciosas fora da seção): ${missingSummary}`)
              : (isFr ? `Adapter uniquement aux pistes présentes (${matchedCount})` : `Adaptar apenas às faixas presentes (${matchedCount})`)}
          </span>
        </div>
      )}
    </div>
  );
};
