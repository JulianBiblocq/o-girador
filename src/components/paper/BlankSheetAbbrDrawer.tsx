/**
 * Tiroir replié par défaut pour personnaliser les abréviations d'instruments (< 110 lignes).
 */
import React, { useState } from 'react';
import { Settings2, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';
import { resolvePupitreAbbr, resolvePupitreDisplayName, saveCustomPupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { tPaper } from '../../i18n/paperWorkshopTranslations';

interface Props {
  lang: 'fr' | 'pt';
}

const INSTRUMENT_KEYS = ['al', 'mc', 'me', 'rp', 'cx', 'tr', 'cx_tr', 'gg', 'ab', 'mi', 'ab_mi', 'tb', 'ap', 'td'];

export const BlankSheetAbbrDrawer: React.FC<Props> = ({ lang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [customAbbrs, setCustomAbbrs] = useState<Record<string, string>>({});
  const isFr = lang === 'fr';

  const handleEditAbbr = (key: string, val: string) => {
    setCustomAbbrs({ ...saveCustomPupitreAbbr(key, val) });
    setEditingCode(null);
  };

  return (
    <div className="flex flex-col border-2 border-[#1a1a1a] bg-[#fdfbf7] shadow-[2px_2px_0px_#1a1a1a]">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-3 py-2 bg-[#f4ecd8] hover:bg-[#e6dec8] text-[#1a1a1a] font-cactus font-bold text-xs uppercase flex items-center justify-between cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings2 size={13} className="text-[#1a1a1a] shrink-0" />
          <span>{isFr ? "Personnaliser les abréviations d'instruments (Mc, Me, Cx...)" : "Personalizar abreviações de instrumentos (Mc, Me, Cx...)"}</span>
        </div>
        {isOpen ? <ChevronDown size={14} className="text-[#1a1a1a] shrink-0" /> : <ChevronRight size={14} className="text-[#1a1a1a] shrink-0" />}
      </button>

      {isOpen && (
        <div className="p-3 border-t-2 border-[#1a1a1a] bg-[var(--cordel-surface,#fdfbf7)] flex flex-col gap-2 text-xs">
          <p className="text-[10px] text-[var(--cordel-text-muted,#555)] italic m-0">
            {tPaper(lang, 'abbrNotice')}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {INSTRUMENT_KEYS.map((k) => {
              const abbr = customAbbrs[k] || resolvePupitreAbbr(k);
              const name = resolvePupitreDisplayName(k, lang);
              return (
                <div key={k} className="flex items-center shadow-[1px_1px_0px_#1a1a1a]">
                  <span className="px-2 py-1 text-[10px] border-2 border-[#1a1a1a] bg-[#f4ecd8] text-[#1a1a1a] font-bold">
                    {abbr} ({name})
                  </span>
                  {editingCode === k ? (
                    <input
                      type="text"
                      autoFocus
                      defaultValue={abbr}
                      maxLength={4}
                      onBlur={(e) => handleEditAbbr(k, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEditAbbr(k, (e.target as any).value)}
                      className="w-12 px-1 py-0.5 bg-white text-[#1a1a1a] font-mono text-[10px] border-2 border-l-0 border-[#1a1a1a] uppercase focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingCode(k)}
                      title={isFr ? "Modifier l'abréviation" : 'Modificar abreviação'}
                      className="px-1.5 py-1 bg-[#e6dec8] hover:bg-[#dcd1b5] border-y-2 border-r-2 border-[#1a1a1a] cursor-pointer text-[#1a1a1a]"
                    >
                      <Edit2 size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
