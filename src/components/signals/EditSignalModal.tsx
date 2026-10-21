import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Tag, Camera, X } from 'lucide-react';
import { CloudRhythmSignal, RhythmSignal } from '../../types';
import { CordelOptions, defaultCordelOptions, processCordelEffectBase64 } from '../../utils/cordelEffect';
import { EditSignalPreview } from './EditSignalPreview';
import { EditSignalCordelInspector } from './EditSignalCordelInspector';

export interface EditSignalModalProps {
  isOpen: boolean;
  onClose: () => void;
  signal: (CloudRhythmSignal | RhythmSignal) | null;
  onSave: (updated: {
    id: string;
    name: string;
    image?: string;
    frames?: string[];
    rawFrames?: string[];
    cordelOptions?: CordelOptions;
    beatsCount?: number;
    mirrorHorizontal?: boolean;
  }) => Promise<void> | void;
  onRetakePhoto?: (targetSignal: CloudRhythmSignal | RhythmSignal) => void;
  lang: 'fr' | 'pt';
  bpm?: number;
}

export const EditSignalModal: React.FC<EditSignalModalProps> = ({
  isOpen,
  onClose,
  signal,
  onSave,
  onRetakePhoto,
  lang,
  bpm = 90,
}) => {
  const [name, setName] = useState('');
  const [activeFrameIdx, setActiveFrameIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [options, setOptions] = useState<CordelOptions>(defaultCordelOptions);
  const [reprocessedFrames, setReprocessedFrames] = useState<string[]>([]);
  const [activePreviewFrame, setActivePreviewFrame] = useState<string | null>(null);
  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    if (signal && isOpen) {
      setName(signal.name || '');
      setActiveFrameIdx(0);
      setImgError(false);
      setOptions(signal.cordelOptions ? { ...signal.cordelOptions } : { ...defaultCordelOptions, isMirror: signal.mirrorHorizontal ?? defaultCordelOptions.isMirror });
      const initialFrames = signal.frames ? [...signal.frames] : [];
      setReprocessedFrames(initialFrames);
      setActivePreviewFrame(initialFrames[0] || signal.image || null);
    }
  }, [signal, isOpen]);

  const rawFrames = signal?.rawFrames;
  const hasRawFrames = !!(rawFrames && rawFrames.length > 0);
  const isSinglePhoto = (signal?.beatsCount === 1) || (!rawFrames || rawFrames.length <= 1);

  useEffect(() => {
    if (!isOpen || !hasRawFrames || !rawFrames || !rawFrames[activeFrameIdx]) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      setIsReprocessing(true);
      try {
        const rendered = await processCordelEffectBase64(rawFrames[activeFrameIdx], options, 180);
        setActivePreviewFrame(rendered);
        setReprocessedFrames((prev) => { const next = [...prev]; next[activeFrameIdx] = rendered; return next; });
      } catch (err) { console.error(err); } finally { setIsReprocessing(false); }
    }, 50);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [options, activeFrameIdx, hasRawFrames, isOpen, rawFrames]);

  if (!isOpen || !signal) return null;

  const resolvedImage = activePreviewFrame || reprocessedFrames[activeFrameIdx] || (signal.frames && signal.frames[activeFrameIdx]) || signal.image || '';
  const initials = signal.name ? signal.name.split(' ').filter(Boolean).map((w) => w[0]?.toUpperCase()).slice(0, 2).join('') : 'SG';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      let finalFrames = reprocessedFrames;
      if (hasRawFrames && rawFrames) {
        finalFrames = await Promise.all(rawFrames.map((r, i) => (i === activeFrameIdx && activePreviewFrame) ? activePreviewFrame : processCordelEffectBase64(r, options, 180)));
      }
      await onSave({
        id: signal.id,
        name: name.trim(),
        image: finalFrames[0] || signal.image,
        frames: finalFrames.length > 0 ? finalFrames : signal.frames,
        rawFrames: signal.rawFrames,
        cordelOptions: options,
        beatsCount: signal.beatsCount,
        mirrorHorizontal: options.isMirror,
      });
      onClose();
    } finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-[310] flex items-center justify-center p-3 select-none font-sans overflow-y-auto">
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] cordel-shadow max-w-2xl w-full p-4 md:p-6 flex flex-col gap-4 relative animate-fade-in my-auto max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 text-lg font-bold hover:text-[var(--cordel-wood)] cursor-pointer w-7 h-7 flex items-center justify-center border border-[var(--cordel-border)]/30">
          <X size={16} />
        </button>
        <div className="border-b-2 border-[var(--cordel-border)] pb-2 pr-8">
          <h2 className="font-cactus text-xl md:text-2xl font-bold uppercase tracking-wider text-[var(--cordel-wood)] flex items-center gap-2">
            <Pencil size={20} />
            <span>{lang === 'fr' ? 'Édition du Signe du Mestre' : 'Editar Sinal do Mestre'}</span>
          </h2>
        </div>
        <form onSubmit={handleSave} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-cactus font-bold uppercase opacity-80 flex items-center gap-1">
              <Tag size={12} />
              <span>{lang === 'fr' ? 'Nom du signal :' : 'Nome do sinal :'}</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du geste..." className="bg-black/5 border-2 border-[var(--cordel-border)] p-2 text-xs md:text-sm font-bold text-[var(--cordel-text)] outline-none" required />
          </div>
          <EditSignalPreview resolvedImage={resolvedImage} showSealFallback={imgError || !resolvedImage} initials={initials} signalName={signal.name} isSinglePhoto={isSinglePhoto} isReprocessing={isReprocessing} activeFrameIdx={activeFrameIdx} totalFramesCount={rawFrames?.length || signal.frames?.length || 1} framesList={reprocessedFrames.length > 0 ? reprocessedFrames : (signal.frames || [])} bpm={bpm} lang={lang} onSelectFrame={setActiveFrameIdx} onImgError={() => setImgError(true)} />
          {hasRawFrames && (
            <EditSignalCordelInspector options={options} lang={lang} onOptionsChange={(p) => setOptions(o => ({ ...o, ...p }))} onReset={() => setOptions({ ...defaultCordelOptions, zoom: 120, detail: 60, shadow: 128, brightness: 0, threshold: 128, sobelContrast: 50, isMirror: true })} />
          )}
          <div className="flex items-center justify-between gap-2 pt-2 border-t-2 border-[var(--cordel-border)]">
            {onRetakePhoto && (
              <button type="button" onClick={() => { onRetakePhoto(signal); onClose(); }} className="px-3 py-2 bg-black/10 hover:bg-black/20 text-xs font-cactus font-bold uppercase border border-[var(--cordel-border)] cursor-pointer flex items-center gap-1.5">
                <Camera size={13} />
                <span>{lang === 'fr' ? 'Reprendre la photo' : 'Tirar outra foto'}</span>
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-transparent hover:bg-black/5 text-xs font-cactus font-bold uppercase border border-[var(--cordel-border)] cursor-pointer">{lang === 'fr' ? 'Annuler' : 'Cancelar'}</button>
              <button type="submit" disabled={isSaving || !name.trim()} className="px-5 py-2 bg-[var(--cordel-wood)] text-[#f4ecd8] text-xs font-cactus font-bold uppercase border-2 border-[var(--cordel-border)] cursor-pointer disabled:opacity-50">{isSaving ? (lang === 'fr' ? 'Enregistrement...' : 'Salvando...') : (lang === 'fr' ? 'Enregistrer' : 'Salvar')}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
