import React, { useState, useMemo } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { generateTablatureCore } from '../../utils/tablature/tablatureCore';
import { printTablature } from '../../utils/tablature/tablatureExportActions';
import { tMobile } from '../../i18n/mobileTranslations';
import { RodaSheetContainer } from '../tablature/roda-sheet/RodaSheetContainer';

interface Props {
  isOpen: boolean; onClose: () => void;
  primaryTrackId?: number | null; referenceTrackId?: number | null; lang?: 'fr' | 'pt';
}

export const MobilePartitionPreviewModal: React.FC<Props> = ({
  isOpen, onClose, primaryTrackId, referenceTrackId, lang: propLang,
}) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const lang = storeLang || propLang || 'pt';
  const isFr = lang === 'fr';
  const tracks = useSequencerStore((s) => s.tracks);
  const totalMeasures = useSequencerStore((s) => s.totalMeasures);
  const songSections = useSequencerStore((s) => s.songSections);
  const metadata = useSequencerStore((s) => s.metadata);
  const measureTimeSigs = useSequencerStore((s) => s.measureTimeSigs);
  const measureBpms = useSequencerStore((s) => s.measureBpms);
  const letras = useSequencerStore((s) => s.letras);

  const [activeTab, setActiveTab] = useState<'linear' | 'roda-sheet'>('linear');
  const [filterMode, setFilterMode] = useState<'pupitre' | 'all'>(primaryTrackId ? 'pupitre' : 'all');

  const targetTracks = useMemo(() => {
    if (filterMode === 'pupitre' && primaryTrackId) {
      const filtered = tracks.filter((t) => t.id === primaryTrackId || (referenceTrackId && t.id === referenceTrackId));
      return filtered.length > 0 ? filtered : tracks;
    }
    return tracks;
  }, [tracks, filterMode, primaryTrackId, referenceTrackId]);

  const previewText = useMemo(() => {
    if (!isOpen || activeTab !== 'linear') return '';
    const title = metadata?.toada?.trim() || (isFr ? 'Partition O Girador' : 'Partitura O Girador');
    const comp = metadata?.compositor ? `${isFr ? 'Compositeur' : 'Compositor'} : ${metadata.compositor}\n` : '';
    const core = generateTablatureCore(targetTracks, totalMeasures || 0, songSections || [], measureTimeSigs, measureBpms, false);
    let out = `${title}\n${comp}\n${core}`;
    if (letras && letras.trim()) out += `\n--- ${isFr ? 'Voix / Paroles' : 'Vozes / Letras'} ---\n${letras}\n`;
    return out;
  }, [isOpen, activeTab, targetTracks, totalMeasures, songSections, measureTimeSigs, measureBpms, letras, metadata, isFr]);

  if (!isOpen) return null;

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-4xl max-h-[92dvh] h-[90dvh] flex flex-col bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] shadow-[4px_4px_0px_#000] overflow-hidden text-[var(--cordel-text)]">
        <div className="p-2.5 border-b-2 border-black flex items-center justify-between bg-[#1a1a1a] shrink-0">
          <div className="flex items-center gap-1.5 text-[#f4ecd8] font-cactus font-bold text-xs uppercase tracking-wider">
            <FileText size={15} className="text-[#b94a2c]" />
            <span>{tMobile(lang, 'scorePreview')}</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[#f4ecd8] hover:text-[#b94a2c] cursor-pointer"><X size={16} /></button>
        </div>

        <div className="p-2 bg-[var(--cordel-surface)] border-b-2 border-[var(--cordel-border)] grid grid-cols-2 gap-2 shrink-0">
          <button
            type="button" onClick={() => setActiveTab('linear')}
            className={`py-1.5 px-2 text-[11px] font-cactus font-bold uppercase tracking-wider border-2 cursor-pointer ${
              activeTab === 'linear' ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black shadow-[1px_1px_0px_#000]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]'
            }`}
          >
            {isFr ? 'Partition Linéaire' : 'Partitura Linear'}
          </button>
          <button
            type="button" onClick={() => setActiveTab('roda-sheet')}
            className={`py-1.5 px-2 text-[11px] font-cactus font-bold uppercase tracking-wider border-2 cursor-pointer ${
              activeTab === 'roda-sheet' ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black shadow-[1px_1px_0px_#000]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]'
            }`}
          >
            {isFr ? 'Planche de Rodas (A4)' : 'Prancha de Rodas (A4)'}
          </button>
        </div>

        {activeTab === 'roda-sheet' ? (
          <div className="flex-1 min-h-0 flex flex-col p-2 overflow-hidden">
            <RodaSheetContainer lang={lang} onClose={onClose} />
          </div>
        ) : (
          <>
            <div className="p-2 bg-[var(--cordel-card-btn-bg)] border-b border-[var(--cordel-border)]/40 flex items-center gap-2 shrink-0">
              <button
                type="button" onClick={() => setFilterMode('pupitre')}
                className={`flex-1 py-1.5 px-2 text-[10px] font-cactus font-bold uppercase tracking-wider border-2 cursor-pointer ${
                  filterMode === 'pupitre' ? 'bg-[#b94a2c] text-[#f4ecd8] border-black' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]'
                }`}
              >
                {tMobile(lang, 'myPupitreOnly')}
              </button>
              <button
                type="button" onClick={() => setFilterMode('all')}
                className={`flex-1 py-1.5 px-2 text-[10px] font-cactus font-bold uppercase tracking-wider border-2 cursor-pointer ${
                  filterMode === 'all' ? 'bg-[#b94a2c] text-[#f4ecd8] border-black' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]'
                }`}
              >
                {tMobile(lang, 'fullScoreAll')}
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 custom-scrollbar bg-[var(--cordel-surface)] font-mono text-[10px] sm:text-xs leading-relaxed whitespace-pre text-[var(--cordel-text)]">
              {previewText}
            </div>
            <div className="p-2.5 bg-[#1a1a1a] border-t-2 border-black flex items-center justify-between gap-2 shrink-0">
              <button type="button" onClick={onClose} className="px-3 py-2 bg-transparent text-[#f4ecd8] border border-[#f4ecd8]/40 font-cactus font-bold text-xs uppercase cursor-pointer">
                {tMobile(lang, 'fermer')}
              </button>
              <button
                type="button"
                onClick={() => printTablature(targetTracks, new Set<number>(), totalMeasures, songSections, metadata, measureTimeSigs, measureBpms, letras)}
                className="px-4 py-2 bg-[#b94a2c] hover:bg-[#a03d22] text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                <Printer size={15} />
                <span>{tMobile(lang, 'printPdf')}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
