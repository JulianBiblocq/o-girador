
import React, { useMemo } from 'react';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useTransportStore } from '../stores/useTransportStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { i18n } from '../data';
import { getEffectiveBpm } from '../utils/bpmUtils';
import { TransportMetronomeSection } from './transport/TransportMetronomeSection';
import { TransportBpmControl } from './transport/TransportBpmControl';
import { TransportSpeedTrainerButton } from './transport/TransportSpeedTrainerButton';
import { TransportPlaybackButtons } from './transport/TransportPlaybackButtons';

interface TransportBarProps {
  viewMode: 'roda' | 'console' | 'timeline';
}

const EMPTY_SIGNALS: any[] = [];

const TransportBarComponent: React.FC<TransportBarProps> = () => {
  const sequencer = useSequencer();
  const audio = useAudio();
  const { lang, setBpm } = sequencer;

  const { isMetroOn, setIsMetroOn } = useTransportStore(
    useShallow((state) => ({ isMetroOn: state.isMetroOn, setIsMetroOn: state.setIsMetroOn }))
  );

  const loopMode = useSequencerStore(state => state.loopMode);
  const currentLoopIteration = useSequencerStore(state => state.currentLoopIteration);
  const isLoopBypassed = useSequencerStore(state => state.isLoopBypassed);
  const isLoopExitRequested = useSequencerStore(state => state.isLoopExitRequested);

  const isSpeedTrainerActive = useSequencerStore(state => state.isSpeedTrainerActive);
  const speedTrainerTourCount = useSequencerStore(state => state.speedTrainerTourCount);
  const speedTrainerCurrentBpm = useSequencerStore(state => state.speedTrainerCurrentBpm);
  const speedTrainerCountdown = useSequencerStore(state => state.speedTrainerCountdown);
  const openSpeedTrainerModal = useSequencerStore(state => state.openSpeedTrainerModal);

  const currentMeasure = useSequencerStore(state => state.currentMeasure);
  const measureBpms = useSequencerStore(state => state.measureBpms);
  const storeBpm = useSequencerStore(state => state.bpm);
  const effectiveBpm = getEffectiveBpm(storeBpm, measureBpms, currentMeasure);
  const tocarJuntoActive = useSequencerStore(state => state.tocarJuntoActive);
  const tocarJuntoTrackId = useSequencerStore(state => state.tocarJuntoTrackId);

  const preRollSettings = useTransportStore((state) => state.preRollSettings);
  const setPreRollSettings = useTransportStore((state) => state.setPreRollSettings);
  const localRhythmSignals = useSequencerStore((state) => state.metadata?.rhythmSignals) ?? EMPTY_SIGNALS;
  const mestreSignals = useSequencerStore((state) => state.mestreSignals) ?? EMPTY_SIGNALS;

  const availableSignals = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    for (const s of mestreSignals) {
      if (s?.id && !seen.has(s.id)) {
        seen.add(s.id);
        const resolvedImage = (s.frames?.[0]?.startsWith('data:')) ? s.frames[0] : (s.image?.startsWith('data:') ? s.image : (s.imageUrl?.startsWith('data:') ? s.imageUrl : (s.image || s.imageUrl || '')));
        list.push({ id: s.id, name: s.name || s.id, image: resolvedImage, frames: s.frames, beatsCount: s.beatsCount, isCloud: true });
      }
    }
    for (const s of localRhythmSignals) {
      if (s?.id && !seen.has(s.id)) {
        seen.add(s.id);
        const resolvedImage = (s.frames?.[0]?.startsWith('data:')) ? s.frames[0] : (s.image?.startsWith('data:') ? s.image : (s.image || ''));
        list.push({ id: s.id, name: s.name || s.id, image: resolvedImage, frames: s.frames, beatsCount: s.beatsCount, isCloud: false });
      }
    }
    if (list.length === 0) {
      list.push(
        { id: 'pictures/logo-samambaia.png', name: lang === 'fr' ? 'Signe Luanda' : 'Sinal Luanda', image: '/Pictures/logo-samambaia.png' },
        { id: 'pictures/atelier.png', name: lang === 'fr' ? 'Signe Trovão' : 'Sinal Trovão', image: '/Pictures/atelier.png' }
      );
    }
    return list;
  }, [mestreSignals, localRhythmSignals, lang]);

  const t = (key: string) => ((i18n[lang] as any)[key] || key);

  return (
    <div className="w-full h-[60px] bg-[var(--cordel-bg)] border-t-2 border-[var(--cordel-border)] relative flex flex-nowrap items-center justify-between px-1 sm:px-2.5 lg:px-4 z-50 shrink-0 overflow-visible gap-1">
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 shrink-0">
        <TransportMetronomeSection isMetroOn={isMetroOn} setIsMetroOn={setIsMetroOn} preRollSettings={preRollSettings} setPreRollSettings={setPreRollSettings} availableSignals={availableSignals} lang={lang} t={t} />
        <TransportBpmControl bpm={effectiveBpm} setBpm={setBpm} lang={lang} />
        <TransportSpeedTrainerButton isSpeedTrainerActive={isSpeedTrainerActive} speedTrainerTourCount={speedTrainerTourCount} speedTrainerCurrentBpm={speedTrainerCurrentBpm} speedTrainerCountdown={speedTrainerCountdown} tocarJuntoActive={tocarJuntoActive} tocarJuntoTrackId={tocarJuntoTrackId} openSpeedTrainerModal={openSpeedTrainerModal} lang={lang} />
      </div>

      <TransportPlaybackButtons handleStop={audio.handleStop} handleTogglePlay={audio.handleTogglePlay} isLoading={audio.isLoading} isPlaying={audio.isPlaying} isLooping={sequencer.isLooping} setIsLooping={sequencer.setIsLooping} loopMode={loopMode} currentLoopIteration={currentLoopIteration} isLoopBypassed={isLoopBypassed} isLoopExitRequested={isLoopExitRequested} handleAudioRecordingToggle={audio.handleAudioRecordingToggle} isRecording={audio.isRecording} recordingSeconds={audio.recordingSeconds} lang={lang} />
    </div>
  );
};

export const TransportBar = React.memo(TransportBarComponent);
