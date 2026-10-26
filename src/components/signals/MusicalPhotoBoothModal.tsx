import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { CordelOptions } from '../../utils/cordelEffect';
import { usePhotoBoothAudio } from './photobooth/usePhotoBoothAudio';
import { usePhotoBoothCamera } from './photobooth/usePhotoBoothCamera';
import { usePhotoBoothReprocess } from './photobooth/usePhotoBoothReprocess';
import { usePhotoBoothCaptureSequence } from './photobooth/usePhotoBoothCaptureSequence';
import { PhotoBoothCaptureOverlay } from './photobooth/PhotoBoothCaptureOverlay';
import { PhotoBoothCaptureControls } from './photobooth/PhotoBoothCaptureControls';
import { PhotoBoothReviewSection } from './photobooth/PhotoBoothReviewSection';
import { PhotoBoothHeader } from './photobooth/PhotoBoothHeader';
import { PhotoBoothGalleryTab } from './photobooth/PhotoBoothGalleryTab';
import { useCameraTimerCountdown } from './photobooth/useCameraTimerCountdown';
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
  const [isGhostActive, setIsGhostActive] = useState(false);
  const timer = useCameraTimerCountdown();
  const { playBeep, closeAudio } = usePhotoBoothAudio();
  const { videoRef, rawBase64ImagesRef, facingMode, startCamera, stopCamera, flipCamera, captureCurrentFrame } = usePhotoBoothCamera();
  const reprocess = usePhotoBoothReprocess(rawBase64ImagesRef);
  const beatNumberElRef = useRef<HTMLDivElement | null>(null), flashElRef = useRef<HTMLDivElement | null>(null);

  const { handleStartCaptureSequence, clearAllTimers } = usePhotoBoothCaptureSequence(
    bpm, beatsCount, playBeep, captureCurrentFrame, stopCamera, reprocess.startCordelProcessing,
    setPhase, setCurrentStepIdx, setSasCountdown, beatNumberElRef, flashElRef, rawBase64ImagesRef
  );

  const handleTriggerCapture = useCallback(() => {
    if (beatsCount === 1) {
      if (rawBase64ImagesRef.current) rawBase64ImagesRef.current = [];
      timer.startCountdown(async () => {
        captureCurrentFrame(); stopCamera(); setPhase('processing');
        await reprocess.startCordelProcessing(); setPhase('review');
      });
    } else {
      handleStartCaptureSequence();
    }
  }, [beatsCount, timer, captureCurrentFrame, stopCamera, reprocess, handleStartCaptureSequence, rawBase64ImagesRef]);

  useEffect(() => {
    if (isOpen) {
      setBpm(initialBpm || 90); setPhase('idle'); setCurrentStepIdx(0); setActiveTab('capture');
      setEditingSignalId(null); setSignalName(lang === 'fr' ? 'Geste du Mestre' : 'Gesto do Mestre'); startCamera();
    } else { stopCamera(); timer.cancelCountdown(); clearAllTimers(); }
    return () => { stopCamera(); timer.cancelCountdown(); closeAudio(); clearAllTimers(); };
  }, [isOpen, initialBpm, lang, startCamera, stopCamera, closeAudio, timer, clearAllTimers]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'capture' || phase !== 'idle') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const tag = (document.activeElement?.tagName || '').toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault(); handleTriggerCapture();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, phase, handleTriggerCapture]);

  const handlePickFromGallery = (sig: CloudRhythmSignal) => {
    setEditingSignalId(sig.id); setSignalName(sig.name); setBeatsCount(sig.beatsCount || (sig.frames?.length ?? 1));
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
    onSave(payload); onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[200] flex items-center justify-center p-3 select-none" onClick={onClose}>
      <div className="bg-[#f4ecd8] border-[3px] border-[#1a1a1a] p-4 max-w-2xl w-full max-h-[92vh] overflow-y-auto rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-3 text-[#1a1a1a]" onClick={(e) => e.stopPropagation()}>
        <PhotoBoothHeader activeTab={activeTab} onChangeTab={setActiveTab} onClose={onClose} lang={lang} />
        {activeTab === 'gallery' ? (
          <PhotoBoothGalleryTab onPickSignal={handlePickFromGallery} onCopyStyle={reprocess.handleUpdateCordelOptions} onOpenBatch={() => setIsBatchOpen(true)} selectedSignalId={editingSignalId} lang={lang} />
        ) : phase !== 'review' ? (
          <div className="flex flex-col gap-3">
            <PhotoBoothCaptureOverlay
              phase={phase} videoRef={videoRef} beatNumberElRef={beatNumberElRef} flashElRef={flashElRef}
              sasCountdown={sasCountdown} currentStepIdx={currentStepIdx} beatsCount={beatsCount} lang={lang}
              facingMode={facingMode} onFlipCamera={flipCamera} isGhostActive={isGhostActive}
              onToggleGhost={() => setIsGhostActive((g) => !g)} ghostReferenceImage={reprocess.processedFrames[0] || null}
              isCountingDown={timer.isCountingDown} countdownNumber={timer.countdownNumber}
            />
            {phase === 'idle' && (
              <PhotoBoothCaptureControls
                beatsCount={beatsCount} onSelectBeatsCount={setBeatsCount} timerSec={timer.timerSec}
                onSelectTimer={timer.setTimerSec} onTrigger={handleTriggerCapture} isCountingDown={timer.isCountingDown} lang={lang}
              />
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
