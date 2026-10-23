
import React, { useState } from 'react';
import { Upload, X, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { CordelOptions, defaultCordelOptions } from '../../utils/cordelEffect';
import { BatchItem, GroupedSignalItem, readFileAsBase64, processBatchItems, groupBatchIntoSignals } from '../../utils/signals/batchPhotoProcessor';

export interface PhotoBatchImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (signals: GroupedSignalItem[]) => void;
  lang: 'fr' | 'pt';
}

export const PhotoBatchImporterModal: React.FC<PhotoBatchImporterModalProps> = ({ isOpen, onClose, onSaveBatch, lang }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [framesPerSignal, setFramesPerSignal] = useState<number>(1);
  const [baseName, setBaseName] = useState<string>('Geste');
  const [options, setOptions] = useState<CordelOptions>({ ...defaultCordelOptions, woodGrain: 10, lockFraming: true });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [processedSignals, setProcessedSignals] = useState<GroupedSignalItem[]>([]);

  if (!isOpen) return null;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newItems: BatchItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type.startsWith('image/')) {
        const raw = await readFileAsBase64(file);
        newItems.push({ id: `batch_${Date.now()}_${i}`, file, name: file.name, rawBase64: raw });
      }
    }
    setItems((prev) => [...prev, ...newItems]);
    setProcessedSignals([]);
  };

  const handleProcess = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    setProgress({ done: 0, total: items.length });
    try {
      const res = await processBatchItems(items, options, (done, total) => setProgress({ done, total }));
      const grouped = groupBatchIntoSignals(res, framesPerSignal, baseName, options);
      setProcessedSignals(grouped);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans text-xs">
      <div className="bg-[var(--cordel-bg,#f4ecd8)] text-[#1a1a1a] border-2 border-[var(--cordel-border,#1a1a1a)] shadow-[6px_6px_0px_#000] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-[#1a1a1a] text-[#f4ecd8] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-cactus font-bold text-sm tracking-wide">
            <Upload size={18} className="text-[#d99b26]" />
            <span>{lang === 'fr' ? 'IMPORT PHOTO PAR LOT (CORDEL)' : 'IMPORTAÇÃO EM LOTE (CORDEL)'}</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-white/10 rounded cursor-pointer" aria-label="Fermer"><X size={16} /></button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
          <div className="border-2 border-dashed border-[#1a1a1a] bg-black/5 p-4 text-center cursor-pointer hover:bg-black/10">
            <input type="file" multiple accept="image/*" onChange={(e) => handleFiles(e.target.files)} className="hidden" id="batch-file-input" />
            <label htmlFor="batch-file-input" className="cursor-pointer flex flex-col items-center gap-1 font-cactus font-bold text-xs uppercase">
              <ImageIcon size={28} className="text-[var(--cordel-wood,#8b2a1a)]" />
              <span>{lang === 'fr' ? 'Glissez des photos ici ou cliquez' : 'Arraste fotos aqui ou clique'}</span>
              <span className="text-[10px] opacity-70 font-sans font-normal">{items.length} {lang === 'fr' ? 'photo(s) sélectionnée(s)' : 'foto(s) selecionada(s)'}</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-black/5 p-3 border border-[var(--cordel-border,#1a1a1a)]">
            <div>
              <label className="font-bold text-[10px] uppercase text-[#8b2a1a] block mb-1">{lang === 'fr' ? 'Découpage des signaux :' : 'Divisão dos sinais :'}</label>
              <div className="flex gap-2">
                {[1, 4].map((n) => (
                  <button key={n} type="button" onClick={() => setFramesPerSignal(n)} className={`flex-1 py-1 text-[11px] font-bold border border-[#1a1a1a] cursor-pointer ${framesPerSignal === n ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] text-[#1a1a1a]'}`}>
                    {n === 1 ? (lang === 'fr' ? '1 photo = 1 signe' : '1 foto = 1 sinal') : (lang === 'fr' ? '4 photos = 1 geste' : '4 fotos = 1 gesto')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-bold text-[10px] uppercase text-[#8b2a1a] block mb-1">{lang === 'fr' ? 'Nom de base :' : 'Nome base :'}</label>
              <input type="text" value={baseName} onChange={(e) => setBaseName(e.target.value)} className="w-full bg-[#f4ecd8] border border-[#1a1a1a] p-1 font-bold text-xs" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-bold"><span>{lang === 'fr' ? 'Grain Bois Cordel' : 'Granulação Madeira'}</span><span>{options.woodGrain ?? 10}%</span></div>
              <input type="range" min="0" max="60" value={options.woodGrain ?? 10} onChange={(e) => setOptions((o) => ({ ...o, woodGrain: Number(e.target.value) }))} className="w-full" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-bold"><span>{lang === 'fr' ? 'Seuil Encrage' : 'Limiar Tinta'}</span><span>{options.threshold ?? 128}</span></div>
              <input type="range" min="40" max="200" value={options.threshold ?? 128} onChange={(e) => setOptions((o) => ({ ...o, threshold: Number(e.target.value) }))} className="w-full" />
            </div>
          </div>

          {items.length > 0 && processedSignals.length === 0 && (
            <button type="button" onClick={handleProcess} disabled={isProcessing} className="w-full py-2.5 bg-[#8b2a1a] text-[#f4ecd8] font-cactus font-bold uppercase tracking-wider border-2 border-[#1a1a1a] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              {isProcessing ? <><Loader2 size={16} className="animate-spin" /> {lang === 'fr' ? `Gravure Cordel (${progress.done}/${progress.total})...` : `Gravando Cordel (${progress.done}/${progress.total})...`}</> : <><Check size={16} /> {lang === 'fr' ? 'Graver et générer les signaux' : 'Gravar e gerar sinais'}</>}
            </button>
          )}

          {processedSignals.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-cactus font-bold text-xs uppercase text-[#8b2a1a]">{processedSignals.length} {lang === 'fr' ? 'signaux prêts :' : 'sinais prontos :'}</span>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1 bg-black/5 border border-[#1a1a1a]">
                {processedSignals.map((s, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1 bg-[#f4ecd8] p-1 border border-[#1a1a1a]">
                    <img src={s.image} alt={s.name} className="w-14 h-14 object-cover border border-[#1a1a1a]" />
                    <span className="text-[9px] font-bold truncate max-w-full">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-black/5 border-t-2 border-[#1a1a1a] flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 font-bold uppercase border border-[#1a1a1a] bg-[#f4ecd8] text-[#1a1a1a] hover:bg-black/5 cursor-pointer">{lang === 'fr' ? 'Annuler' : 'Cancelar'}</button>
          {processedSignals.length > 0 && (
            <button type="button" onClick={() => { onSaveBatch(processedSignals); onClose(); }} className="px-4 py-1.5 font-cactus font-bold uppercase border-2 border-[#1a1a1a] bg-[#8b2a1a] text-[#f4ecd8] hover:opacity-90 cursor-pointer shadow-[2px_2px_0px_#000]">
              {lang === 'fr' ? `Valider l'import (${processedSignals.length})` : `Confirmar importação (${processedSignals.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoBatchImporterModal;
