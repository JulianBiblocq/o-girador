import React, { useState, useEffect, useRef, Suspense } from 'react';
import { CordelOptions } from '../../utils/cordelEffect';
import { usePhotoBoothAudio } from './photobooth/usePhotoBoothAudio';
import { usePhotoBoothCamera } from './photobooth/usePhotoBoothCamera';
import { usePhotoBoothReprocess } from './photobooth/usePhotoBoothReprocess';
import { usePhotoBoothCaptureSequence } from './photobooth/usePhotoBoothCaptureSequence';
import { PhotoBoothCaptureOverlay } from './photobooth/PhotoBoothCaptureOverlay';
import { PhotoBoothControlsSidebar } from './photobooth/PhotoBoothControlsSidebar';
import { PhotoBoothReviewTimeline } from './photobooth/PhotoBoothReviewTimeline';

const PhotoBatchImporterModal = React.lazy(() => import('./PhotoBatchImporterModal'));

export interface MusicalPhotoBoothModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signal: {
    name: string;
    image: string;
    frames: string[];
    rawFrames?: string[];
    cordelOptions?: CordelOptions;
    frameOverrides?: Record<number, Partial<CordelOptions>>;
    beatsCount: number;
    mirrorHorizontal?: boolean;
  }) => void;
  initialBpm?: number;
  lang: 'fr' | 'pt';
}

export const MusicalPhotoBoothModal: React.FC<MusicalPhotoBoothModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialBpm = 90,
  lang,
}) => {
  const [phase, setPhase] = useState<'idle' | 'repositioning' | 'beat_countdown' | 'processing' | 'review'>('idle');
  const [beatsCount, setBeatsCount] = useState<number>(4);
  const [bpm, setBpm] = useState<number>(initialBpm);
  const [signalName, setSignalName] = useState<string>('');
  const [isBatchOpen, setIsBatchOpen] = useState<boolean>(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [sasCountdown, setSasCountdown] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const { playBeep, closeAudio } = usePhotoBoothAudio();
  const { videoRef, rawBase64ImagesRef, startCamera, stopCamera, captureCurrentFrame } = usePhotoBoothCamera();
  const reprocess = usePhotoBoothReprocess(rawBase64ImagesRef);
  const beatNumberElRef = useRef<HTMLDivElement | null>(null);
  const flashElRef = useRef<HTMLDivElement | null>(null);

  const { handleStartCaptureSequence, timerRef } = usePhotoBoothCaptureSequence(
    bpm, beatsCount, playBeep, captureCurrentFrame, stopCamera, reprocess.startCordelProcessing,
    setPhase, setCurrentStepIdx, setSasCountdown, beatNumberElRef, flashElRef, rawBase64ImagesRef
  );

  useEffect(() => {
    if (isOpen) {
      setBpm(initialBpm || 90);
      setPhase('idle');
      setCurrentStepIdx(0);
      setSignalName(lang === 'fr' ? 'Geste du Mestre' : 'Gesto do Mestre');
      startCamera();
    } else {
      stopCamera();
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => { stopCamera(); closeAudio(); };
  }, [isOpen, initialBpm, lang, startCamera, stopCamera, closeAudio, timerRef]);

  const handleSaveSignal = () => {
    if (reprocess.processedFrames.length === 0) return;
    onSave({
      name: signalName.trim() || (lang === 'fr' ? 'Signal' : 'Sinal'),
      image: reprocess.processedFrames[0],
      frames: reprocess.processedFrames,
      rawFrames: rawBase64ImagesRef.current,
      cordelOptions: reprocess.cordelOptions,
      frameOverrides: reprocess.frameOverrides,
      beatsCount,
      mirrorHorizontal: reprocess.cordelOptions.isMirror,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[200] flex items-center justify-center p-3 select-none" onClick={onClose}>
      <div className="bg-[#f4ecd8] border-[3px] border-[#1a1a1a] p-4 max-w-2xl w-full max-h-[92vh] overflow-y-auto rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-3 text-[#1a1a1a]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-1.5">
          <h3 className="font-cactus text-xl font-bold">📸 {lang === 'fr' ? 'Photomaton Musical' : 'Cabine de Fotos'}</h3>
          <button onClick={onClose} className="text-lg font-bold hover:text-[#8b2a1a] cursor-pointer">✕</button>
        </div>

        {phase !== 'review' ? (
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
                <button type="button" onClick={handleStartCaptureSequence} className="px-4 py-1.5 bg-[#8b2a1a] text-white font-cactus font-bold text-sm border border-black shadow-[2px_2px_0px_#000] cursor-pointer">▶ {lang === 'fr' ? 'Démarrer' : 'Iniciar'}</button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PhotoBoothReviewTimeline frames={reprocess.processedFrames} selectedFrameIndex={reprocess.selectedFrameIndex} activePlayheadIndex={0} isPlaying={isPlaying} bpm={bpm} lang={lang} onSelectFrame={reprocess.setSelectedFrameIndex} onTogglePlay={() => setIsPlaying(!isPlaying)} onBpmChange={setBpm} />
            <div className="flex flex-col gap-2">
              <PhotoBoothControlsSidebar overrideMode={reprocess.overrideMode} selectedFrameIndex={reprocess.selectedFrameIndex} options={reprocess.activeInspectorOptions} hasLocalOverride={Boolean(reprocess.frameOverrides[reprocess.selectedFrameIndex])} isReprocessing={reprocess.isReprocessing} lang={lang} setOverrideMode={reprocess.setOverrideMode} onUpdateOption={reprocess.handleUpdateCordelOptions} onResetLocalOverride={reprocess.handleResetLocalOverride} />
              <input type="text" value={signalName} onChange={(e) => setSignalName(e.target.value)} placeholder="Nom du geste..." className="bg-white border border-black px-2 py-1 text-xs font-bold" />
              <button type="button" onClick={handleSaveSignal} className="py-2 bg-[#1b4332] text-white font-cactus font-bold text-sm border border-black shadow-[2px_2px_0px_#000] cursor-pointer">💾 {lang === 'fr' ? 'Enregistrer le signal' : 'Salvar o sinal'}</button>
            </div>
          </div>
        )}
      </div>
      {isBatchOpen && (
        <Suspense fallback={null}>
          <PhotoBatchImporterModal isOpen={isBatchOpen} onClose={() => setIsBatchOpen(false)} onSaveBatch={() => {}} lang={lang} />
        </Suspense>
      )}
    </div>
  );
};
