import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Language, WorkspaceTemplate } from '../../types';
import { instrumentsConfig } from '../../data';
import { XiloScroll } from '../XiloIcons';

interface NewSongTemplatesViewProps {
  lang: Language;
  templates: WorkspaceTemplate[];
  onBack: () => void;
  onSelectTemplate?: (template: WorkspaceTemplate) => void;
}

export const NewSongTemplatesView: React.FC<NewSongTemplatesViewProps> = ({
  lang,
  templates,
  onBack,
  onSelectTemplate,
}) => {
  const isPt = lang === 'pt';

  return (
    <>
      <div className="border-b-2 border-[var(--cordel-border-strong)] pb-3 flex items-center justify-between gap-3 pr-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_var(--cordel-shadow-color)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            <span>{isPt ? 'Voltar' : 'Retour'}</span>
          </button>
          <h3 className="font-cactus text-xl md:text-2xl font-bold text-[var(--cordel-text)] uppercase tracking-wider flex items-center gap-2">
            <XiloScroll size={24} className="shrink-0 text-[var(--cordel-accent-readable)]" />
            <span>{isPt ? 'Escolher um Modelo de Batuque' : 'Choisir un Gabarit de Batuque'}</span>
          </h3>
        </div>
        <span className="text-[10px] font-cactus font-bold text-[var(--cordel-text-muted)] uppercase hidden sm:inline">
          {isPt ? 'Modelos de Estúdio & Privados' : 'Gabarits Studio & Privés'}
        </span>
      </div>

      <div className="max-h-[55vh] overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar">
        {templates.map((tpl) => {
          const displayName = isPt ? (tpl.namePt || tpl.name) : (tpl.nameFr || tpl.name);
          const displayDesc = isPt ? tpl.descriptionPt : tpl.descriptionFr;
          return (
            <div
              key={tpl.id}
              className="border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] p-4 shadow-[3px_3px_0px_var(--cordel-shadow-color)] flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[3px_6px_4px_8px]"
            >
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-cactus font-bold text-base text-[var(--cordel-text)] truncate" title={displayName}>
                    {displayName}
                  </span>
                  <span className="text-[9px] font-bold font-cactus bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text-muted)] border border-[var(--cordel-border)] px-1.5 py-0.5 rounded shrink-0">
                    {tpl.tracks.length} {isPt ? 'faixas' : 'pistes'}
                  </span>
                </div>

                {displayDesc && (
                  <p className="font-cactus text-[11px] font-semibold text-[var(--cordel-text-muted)]">{displayDesc}</p>
                )}

                <div className="flex flex-wrap gap-1 py-1">
                  {tpl.tracks.map((tr, idx) => {
                    const inst = instrumentsConfig[tr.instrumentIdx];
                    const label = tr.customName || (inst ? inst.name : `Track ${idx + 1}`);
                    return (
                      <span
                        key={idx}
                        className="bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border)] px-1.5 py-0.5 text-[9px] font-cactus font-bold rounded"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-1.5 text-[9px] font-mono text-[var(--cordel-text-muted)]">
                  {tpl.options.includeVolumePan && <span>Vol/Pan</span>}
                  {tpl.options.includeEQ && <span>• EQ</span>}
                  {tpl.options.includeFX && <span>• FX</span>}
                  {tpl.options.includeStructure && <span>• Bus/Liens</span>}
                  {tpl.options.includeDisplayOrder && <span>• Roda</span>}
                </div>
              </div>

              <div className="shrink-0 flex items-center">
                <button
                  type="button"
                  onClick={() => onSelectTemplate?.(tpl)}
                  className="w-full md:w-auto px-4 py-2 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-xs shadow-[2px_2px_0px_var(--cordel-shadow-color)] hover:bg-[var(--cordel-accent)] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors"
                >
                  {isPt ? 'Carregar este modelo' : 'Charger ce gabarit'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
