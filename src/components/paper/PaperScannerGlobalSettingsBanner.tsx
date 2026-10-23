/**
 * Bandeau des réglages globaux du morceau (Titre, BPM, Signature, Bus) (< 115 lignes).
 */
import React from 'react';
import { Globe, RefreshCw, Link } from 'lucide-react';
import { tPaper } from '../../i18n/paperWorkshopTranslations';

interface Props {
  title: string;
  onChangeTitle: (val: string) => void;
  bpm: number;
  onChangeBpm: (val: number) => void;
  timeSig: string;
  onChangeTimeSig: (val: string) => void;
  onApplyToAllPatterns: () => void;
  linkAlfaias: boolean;
  onToggleLinkAlfaias: (val: boolean) => void;
  busCaixas: boolean;
  onToggleBusCaixas: (val: boolean) => void;
  busSementes: boolean;
  onToggleBusSementes: (val: boolean) => void;
  lang: 'fr' | 'pt';
}

export const PaperScannerGlobalSettingsBanner: React.FC<Props> = ({
  title, onChangeTitle, bpm, onChangeBpm, timeSig, onChangeTimeSig, onApplyToAllPatterns,
  linkAlfaias, onToggleLinkAlfaias, busCaixas, onToggleBusCaixas, busSementes, onToggleBusSementes, lang,
}) => {
  const isFr = lang === 'fr';
  const signatures = ['4/4', '2/4', '3/4', '6/8', '12/8'];

  return (
    <div className="flex flex-col gap-2 p-2.5 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] text-xs text-[var(--cordel-text)] shadow-[2px_2px_0px_var(--cordel-border)]">
      {/* 1. ENTÊTE & TITRE */}
      <div className="flex flex-wrap items-center justify-between gap-1 pb-1.5 border-b border-[var(--cordel-border)]/30">
        <span className="font-cactus font-bold uppercase text-[11px] text-[#8b2a1a] flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" />
          <span>{isFr ? 'Réglages Globaux du Morceau' : 'Configurações Globais da Música'}</span>
        </span>
        <span className="text-[10px] text-[var(--cordel-text-muted)] italic">
          {isFr ? 'Applicables à tout le morceau (avec surcharge par pattern possible)' : 'Aplicáveis a toda a música (com exceção por padrão)'}
        </span>
      </div>

      {/* 2. TITRE, BPM & SIGNATURE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold text-[#8b2a1a] uppercase">{isFr ? 'Titre :' : 'Título :'}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder={tPaper(lang, 'songTitlePlaceholder')}
            className="p-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-border)] font-cactus text-xs font-bold"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold text-[#8b2a1a] uppercase">BPM Global :</label>
          <input
            type="number"
            min={40}
            max={240}
            value={bpm}
            onChange={(e) => onChangeBpm(Number(e.target.value) || 96)}
            className="p-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-border)] font-mono text-xs font-bold"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold text-[#8b2a1a] uppercase">{isFr ? 'Signature Globale :' : 'Fórmula Global :'}</label>
          <div className="flex items-center gap-1">
            <select
              value={timeSig}
              onChange={(e) => onChangeTimeSig(e.target.value)}
              className="p-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-border)] font-mono text-xs font-bold flex-1"
            >
              {signatures.map((sig) => (
                <option key={sig} value={sig}>{sig}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={onApplyToAllPatterns}
              title={isFr ? 'Appliquer ce BPM & Signature à tous les patterns' : 'Aplicar a todos os padrões'}
              className="px-2 py-1 bg-[#8b2a1a] text-[#f4ecd8] border border-[var(--cordel-border)] cursor-pointer font-bold text-[10px] flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{isFr ? 'Tous' : 'Todos'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. GROUPEMENTS & BUS */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--cordel-border)]/20 text-[10px]">
        <span className="font-bold text-[#8b2a1a] uppercase">{isFr ? 'Groupements :' : 'Agrupamentos :'}</span>
        <button
          type="button"
          onClick={() => onToggleLinkAlfaias(!linkAlfaias)}
          className={`px-2 py-0.5 border font-cactus font-bold cursor-pointer flex items-center gap-1 ${linkAlfaias ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[var(--cordel-border)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/40'}`}
        >
          <Link size={10} /> <span>{tPaper(lang, 'linkAlfaias')} (Al)</span>
        </button>
        <button
          type="button"
          onClick={() => onToggleBusCaixas(!busCaixas)}
          className={`px-2 py-0.5 border font-cactus font-bold cursor-pointer flex items-center gap-1 ${busCaixas ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[var(--cordel-border)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/40'}`}
        >
          <Link size={10} /> <span>{tPaper(lang, 'busCaixas')} (Cx+Tr)</span>
        </button>
        <button
          type="button"
          onClick={() => onToggleBusSementes(!busSementes)}
          className={`px-2 py-0.5 border font-cactus font-bold cursor-pointer flex items-center gap-1 ${busSementes ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[var(--cordel-border)]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/40'}`}
        >
          <Link size={10} /> <span>{tPaper(lang, 'busSementes')} (Ab+Mi)</span>
        </button>
      </div>
    </div>
  );
};
