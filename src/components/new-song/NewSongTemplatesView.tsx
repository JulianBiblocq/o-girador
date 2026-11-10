import React from 'react';
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
  return (
    <>
      <div className="border-b-4 border-[var(--cordel-ink-dark)] pb-3 flex items-center justify-between gap-3 pr-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-1 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_var(--cordel-ink-dark)] hover:bg-[var(--cordel-ink-dark)] hover:text-[var(--cordel-parchment-bg)] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition-all"
          >
            ← {lang === 'pt' ? 'Voltar' : 'Retour'}
          </button>
          <h3 className="font-cactus text-2xl md:text-3xl font-bold text-[var(--cordel-ink-dark)] uppercase tracking-wider flex items-center gap-2">
            <XiloScroll size={26} className="shrink-0" />
            <span>{lang === 'fr' ? 'Choisir un Gabarit de Batuque' : 'Escolher um Modelo de Batuque'}</span>
          </h3>
        </div>
        <span className="text-[10px] font-cactus font-bold text-[var(--cordel-ink-dark)]/70 uppercase hidden sm:inline">
          {lang === 'fr' ? 'Gabarits Studio & Privés' : 'Modelos de Estúdio & Privados'}
        </span>
      </div>

      <div className="max-h-[55vh] overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar">
        {templates.map((tpl) => {
          const displayName = lang === 'fr' ? (tpl.nameFr || tpl.name) : (tpl.namePt || tpl.name);
          const displayDesc = lang === 'fr' ? tpl.descriptionFr : tpl.descriptionPt;
          return (
            <div
              key={tpl.id}
              className="border-2 border-[var(--cordel-ink-dark)] bg-[var(--cordel-parchment-bg)] p-4 shadow-[3px_3px_0px_var(--cordel-ink-dark)] flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[3px_6px_4px_8px]"
            >
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-cactus font-bold text-base text-[var(--cordel-ink-dark)] truncate" title={displayName}>
                    {displayName}
                  </span>
                  <span className="text-[9px] font-bold font-cactus bg-[var(--cordel-bg)] border border-[var(--cordel-ink-dark)]/30 px-1.5 py-0.5 rounded shrink-0">
                    {tpl.tracks.length} {lang === 'pt' ? 'faixas' : 'pistes'}
                  </span>
                </div>

                {displayDesc && (
                  <p className="font-cactus text-[11px] font-semibold text-[var(--cordel-ink-dark)]/80">
                    {displayDesc}
                  </p>
                )}

                <div className="flex flex-wrap gap-1 py-1">
                  {tpl.tracks.map((tr, idx) => {
                    const inst = instrumentsConfig[tr.instrumentIdx];
                    const label = tr.customName || (inst ? inst.name : `Track ${idx + 1}`);
                    return (
                      <span
                        key={idx}
                        className="bg-[var(--cordel-bg)] text-[var(--cordel-ink-dark)] border border-[var(--cordel-ink-dark)]/40 px-1.5 py-0.2 text-[9px] font-cactus font-bold rounded"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-1 text-[9px] text-[var(--cordel-ink-dark)]/60">
                  {tpl.options.includeVolumePan && <span>Vol/Pan</span>}
                  {tpl.options.includeEQ && <span>• EQ</span>}
                  {tpl.options.includeFX && <span>• FX</span>}
                  {tpl.options.includeStructure && <span>• Bus/Liens</span>}
                  {tpl.options.includeDisplayOrder && <span>• Roda</span>}
                </div>
              </div>

              <div className="shrink-0 flex items-center">
                <button
                  onClick={() => onSelectTemplate && onSelectTemplate(tpl)}
                  className="w-full md:w-auto px-4 py-2 bg-[var(--cordel-ink-dark)] text-[var(--cordel-parchment-bg)] border-2 border-[var(--cordel-ink-dark)] font-cactus font-bold uppercase text-xs shadow-[2px_2px_0px_var(--cordel-ink-dark)] hover:bg-[var(--cordel-wood)] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition-all"
                >
                  {lang === 'fr' ? 'Charger ce gabarit' : 'Carregar este modelo'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
