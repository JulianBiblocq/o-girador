import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Play, FolderOpen, X } from 'lucide-react';
import { CordelOptions } from '../../utils/cordelEffect';
import { usePhotoBoothAudio } from './photobooth/usePhotoBoothAudio';
import { usePhotoBoothCamera } from './photobooth/usePhotoBoothCamera';
import { usePhotoBoothReprocess } from './photobooth/usePhotoBoothReprocess';
import { usePhotoBoothCaptureSequence } from './photobooth/usePhotoBoothCaptureSequence';
import { PhotoBoothCaptureOverlay } from './photobooth/PhotoBoothCaptureOverlay';
import { PhotoBoothReviewSection } from './photobooth/PhotoBoothReviewSection';
import { MobileMestreSignalGallery } from '../mobile/editor/MobileMestreSignalGallery';
import { CloudRhythmSignal } from '../../types';

const PhotoBatchImporterModal = React.lazy(() => import('./PhotoBatchImporterModal'));

export interface MusicalPhotoBoothModalProps {
  isOpen: boolean; onClose: () => void;
  onSave: (signal: { name: string; image: string; frames: string[]; rawFrames?: string[]; cordelOptions?: CordelOptions; frameOverrides?: Record<number, Partial<CordelOptions>>; beatsCount: number; mirrorHorizontal?: boolean; id?: string; }) => void;
  initialBpm?: number; lang: 'fr' | 'pt';
}

export const MusicalPhotoBoothModal: React.FC<MusicalPhotoBoothModalProps> = ({
  isOpen, onClose, onSave, initialBpm = 90, lang,
}) => {
  const [phase, setPhase] = useState<'idle' | 'repositioning' | 'beat_countdown' | 'processing' | 'review'>('idle');
  const [activeTab, setActiveTab] = useState<'capture' | 'gallery'>('capture');
  const [beatsCount, setBeatsCount] = useState<number>(4), [bpm, setBpm] = useState<number>(initialBpm);
  const [signalName, setSignalName] = useState<string>(''), [editingSignalId, setEditingSignalId] = useState<string | null>(null);
  const [isBatchOpen, setIsBatchOpen] = useState(false), [currentStepIdx, setCurrentStepIdx] = useState(0), [sasCountdown, setSasCountdown] = useState(3);
  const { playBeep, closeAudio } = usePhotoBoothAudio();
  const { videoRef, rawBase64ImagesRef, startCamera, stopCamera, captureCurrentFrame } = usePhotoBoothCamera();
  const reprocess = usePhotoBoothReprocess(rawBase64ImagesRef);
  const beatNumberElRef = useRef<HTMLDivElement | null>(null);
  const flashElRef = useRef<HTMLDivElement | null>(null);

  const { handleStartCaptureSequence, clearAllTimers } = usePhotoBoothCaptureSequence(
    bpm, beatsCount, playBeep, captureCurrentFrame, stopCamera, reprocess.startCordelProcessing,
    setPhase, setCurrentStepIdx, setSasCountdown, beatNumberElRef, flashElRef, rawBase64ImagesRef
  );

  useEffect(() => {
    if (isOpen) {
      setBpm(initialBpm || 90); setPhase('idle'); setCurrentStepIdx(0); setActiveTab('capture');
      setEditingSignalId(null); setSignalName(lang === 'fr' ? 'Geste du Mestre' : 'Gesto do Mestre'); startCamera();
    } else { stopCamera(); clearAllTimers(); }
    return () => { stopCamera(); closeAudio(); clearAllTimers(); };
  }, [isOpen, initialBpm, lang, startCamera, stopCamera, closeAudio]);

  const handlePickFromGallery = (sig: CloudRhythmSignal) => {
    setEditingSignalId(sig.id); setSignalName(sig.name);
    setBeatsCount(sig.beatsCount || (sig.frames?.length ?? 1));
    rawBase64ImagesRef.current = sig.rawFrames?.length ? sig.rawFrames : (sig.frames || [sig.image]);
    if (sig.cordelOptions) reprocess.handleUpdateCordelOptions(sig.cordelOptions);
    reprocess.setProcessedFrames(sig.frames?.length ? sig.frames : [sig.image]);
    setPhase('review'); setActiveTab('capture');
  };

  const handleSaveSignal = async () => {
    if (reprocess.processedFrames.length === 0) return;
    const payload = {
      name: signalName.trim() || (lang === 'fr' ? 'Signal' : 'Sinal'),
      image: reprocess.processedFrames[0], frames: reprocess.processedFrames,
      rawFrames: rawBase64ImagesRef.current, cordelOptions: reprocess.cordelOptions,
      frameOverrides: reprocess.frameOverrides, beatsCount, mirrorHorizontal: reprocess.cordelOptions.isMirror,
      id: editingSignalId || undefined,
    };
    if (editingSignalId) {
      try {
        const { updateMestreSignal } = await import('../../services/cloud-signals/mestreSignalsMutations');
        await updateMestreSignal(editingSignalId, payload);
      } catch (_) {}
    }
    onSave(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[200] flex items-center justify-center p-3 select-none" onClick={onClose}>
      <div className="bg-[#f4ecd8] border-[3px] border-[#1a1a1a] p-4 max-w-2xl w-full max-h-[92vh] overflow-y-auto rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-3 text-[#1a1a1a]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-1.5">
          <div className="flex items-center gap-2">
            <h3 className="font-cactus text-xl font-bold">{lang === 'fr' ? 'Photomaton Musical' : 'Cabine de Fotos'}</h3>
            <div className="flex border border-black text-xs font-cactus font-bold">
              <button type="button" onClick={() => setActiveTab('capture')} className={`px-2 py-0.5 cursor-pointer ${activeTab === 'capture' ? 'bg-[#8b2a1a] text-white' : 'bg-white'}`}>{lang === 'fr' ? 'Prise de vue' : 'Captura'}</button>
              <button type="button" onClick={() => setActiveTab('gallery')} className={`px-2 py-0.5 cursor-pointer ${activeTab === 'gallery' ? 'bg-[#8b2a1a] text-white' : 'bg-white'}`}>{lang === 'fr' ? 'Galerie' : 'Galeria'}</button>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:text-[#8b2a1a] cursor-pointer" aria-label="Close"><X size={18} /></button>
        </div>

        {activeTab === 'gallery' ? (
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <span className="font-cactus font-bold text-xs uppercase text-[#8b2a1a]">{lang === 'fr' ? 'Signes enregistrés' : 'Sinais salvos'}</span>
              <button type="button" onClick={() => setIsBatchOpen(true)} className="px-2 py-1 bg-white border border-black font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer hover:bg-black hover:text-white">
                <FolderOpen size={12} /> <span>{lang === 'fr' ? 'Importer un lot' : 'Importar lote'}</span>
              </button>
            </div>
            <MobileMestreSignalGallery onSelectSignal={handlePickFromGallery} onCopyStyle={reprocess.handleUpdateCordelOptions} selectedSignalId={editingSignalId} lang={lang} />
          </div>
        ) : phase !== 'review' ? (
          <div className="flex flex-col gap-3">
            <PhotoBoothCaptureOverlay phase={phase} videoRef={videoRef} beatNumberElRef={beatNumberElRef} flashElRef={flashElRef} sasCountdown={sasCountdown} currentStepIdx={currentStepIdx} beatsCount={beatsCount} lang={lang} />
            {phase === 'idle' && (
              <div className="flex justify-between items-center bg-[#eaddcf]/50 p-2 border border-black/15 rounded-sm">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span>{lang === 'fr' ? 'Temps :' : 'Tempos :'}</span>
                  {[2, 4, 8].map((c) => (
                    <button key={c} type="button" onClick={() => setBeatsCount(c)} className={`px-2 py-0.5 border border-black ${beatsCount === c ? 'bg-[#8b2a1a] text-white' : 'bg-white'}`}>{c}</button>
                  ))}
                </div>
                <button type="button" onClick={handleStartCaptureSequence} className="px-4 py-1.5 bg-[#8b2a1a] text-white font-cactus font-bold text-sm border border-black shadow-[2px_2px_0px_#000] cursor-pointer flex items-center gap-1">
                  <Play size={14} fill="currentColor" /> <span>{lang === 'fr' ? 'Démarrer' : 'Iniciar'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <PhotoBoothReviewSection
            frames={reprocess.processedFrames} selectedFrameIndex={reprocess.selectedFrameIndex} bpm={bpm} lang={lang}
            overrideMode={reprocess.overrideMode} frameOverrides={reprocess.frameOverrides} activeInspectorOptions={reprocess.activeInspectorOptions}
            isReprocessing={reprocess.isReprocessing} signalName={signalName} editingSignalId={editingSignalId}
            onSelectFrame={reprocess.setSelectedFrameIndex} onBpmChange={setBpm} setOverrideMode={reprocess.setOverrideMode}
            onUpdateOption={reprocess.handleUpdateCordelOptions} onResetLocalOverride={reprocess.handleResetLocalOverride}
            onSignalNameChange={setSignalName} onSaveSignal={handleSaveSignal}
          />
        )}
      </div>
      {isBatchOpen && (
        <Suspense fallback={null}>
          <PhotoBatchImporterModal isOpen={isBatchOpen} onClose={() => setIsBatchOpen(false)} onSaveBatch={(batch) => { batch.forEach((sig: any) => onSave(sig)); setIsBatchOpen(false); }} lang={lang} />
        </Suspense>
      )}
    </div>
  );
};
