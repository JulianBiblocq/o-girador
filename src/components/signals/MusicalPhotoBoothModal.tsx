import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { CordelOptions } from '../../utils/cordelEffect';
import { usePhotoBoothAudio } from './photobooth/usePhotoBoothAudio';
import { usePhotoBoothCamera } from './photobooth/usePhotoBoothCamera';
import { usePhotoBoothReprocess } from './photobooth/usePhotoBoothReprocess';
import { usePhotoBoothCaptureSequence } from './photobooth/usePhotoBoothCaptureSequence';
import { usePhotoBoothSaveHandler } from './photobooth/usePhotoBoothSaveHandler';
import { PhotoBoothCaptureOverlay } from './photobooth/PhotoBoothCaptureOverlay';
import { PhotoBoothCaptureControls } from './photobooth/PhotoBoothCaptureControls';
import { PhotoBoothReviewSection } from './photobooth/PhotoBoothReviewSection';
import { PhotoBoothHeader } from './photobooth/PhotoBoothHeader';
import { PhotoBoothGalleryTab } from './photobooth/PhotoBoothGalleryTab';
import { useCameraTimerCountdown } from './photobooth/useCameraTimerCountdown';

const PhotoBatchImporterModal = React.lazy(() => import('./PhotoBatchImporterModal'));

export interface MusicalPhotoBoothModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signal: {
    name: string; image: string; frames: string[]; rawFrames?: string[];
    cordelOptions?: CordelOptions; frameOverrides?: Record<number, Partial<CordelOptions>>;
    beatsCount: number; mirrorHorizontal?: boolean; id?: string;
  }) => void;
  initialBpm?: number;
  initialTab?: 'capture' | 'gallery';
  lang: 'fr' | 'pt';
}

export const MusicalPhotoBoothModal: React.FC<MusicalPhotoBoothModalProps> = ({
  isOpen, onClose, onSave, initialBpm = 90, initialTab = 'capture', lang,
}) => {
  const [phase, setPhase] = useState<'idle' | 'repositioning' | 'beat_countdown' | 'processing' | 'review'>('idle');
  const [activeTab, setActiveTab] = useState<'capture' | 'gallery'>(initialTab);
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

  const { handlePickFromGallery, handleSaveSignal } = usePhotoBoothSaveHandler({
    lang, signalName, setSignalName, editingSignalId, setEditingSignalId,
    beatsCount, setBeatsCount, rawBase64ImagesRef, reprocess, setPhase, setActiveTab, onSave, onClose,
  });

  const handleTriggerCapture = useCallback(() => {
    if (beatsCount === 1) {
      if (rawBase64ImagesRef.current) rawBase64ImagesRef.current = [];
      timer.startCountdown(async () => {
        captureCurrentFrame(); stopCamera(); setPhase('processing');
        await reprocess.startCordelProcessing(); setPhase('review');
      });
    } else handleStartCaptureSequence();
  }, [beatsCount, timer, captureCurrentFrame, stopCamera, reprocess, handleStartCaptureSequence, rawBase64ImagesRef]);

  useEffect(() => {
    if (isOpen) {
      setBpm(initialBpm || 90); setPhase('idle'); setCurrentStepIdx(0); setActiveTab(initialTab);
      setEditingSignalId(null); setSignalName(lang === 'fr' ? 'Geste du Mestre' : 'Gesto do Mestre');
    } else { stopCamera(); timer.cancelCountdown(); clearAllTimers(); }
    return () => { stopCamera(); timer.cancelCountdown(); closeAudio(); clearAllTimers(); };
  }, [isOpen, initialBpm, initialTab, lang, stopCamera, closeAudio, timer, clearAllTimers]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'capture' && phase === 'idle') startCamera();
    else if (activeTab === 'gallery') stopCamera();
  }, [isOpen, activeTab, phase, startCamera, stopCamera]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBatchOpen) { e.preventDefault(); e.stopImmediatePropagation(); onClose(); return; }
      if (e.code === 'Space' && activeTab === 'capture' && phase === 'idle') {
        const tag = (document.activeElement?.tagName || '').toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault(); handleTriggerCapture();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, isBatchOpen, activeTab, phase, handleTriggerCapture, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100030] flex items-center justify-center p-3 select-none" onClick={onClose}>
      <div className="bg-[var(--cordel-paper-surface)] border-[3px] border-[var(--cordel-paper-ink)] p-4 max-w-2xl w-full max-h-[92vh] overflow-y-auto rounded-sm shadow-[8px_8px_0px_var(--cordel-shadow-color)] flex flex-col gap-3 text-[var(--cordel-paper-ink)]" onClick={(e) => e.stopPropagation()}>
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
    </div>,
    document.body
  );
};
