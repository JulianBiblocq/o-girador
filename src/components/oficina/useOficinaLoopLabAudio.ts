/**
 * useOficinaLoopLabAudio.ts — État & contrôles temps réel du Labo Boucles (`Barulhos B/b` & `Apito L`) (< 105 lignes).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarulhoLoopPointsMs, getActiveLoopBankTier, getEffectiveBarulhoLoopPoints,
  loadAllLoopLabOverrides, LoopLabInstrumentId, resetBarulhoLoopOverride,
  resolveLoopSampleFilePath, setBarulhoLoopOverride,
} from '../../audio/engine/barulhoLoopRegistry';
import { ActiveLoopLabVoice, decodeLoopLabAudioBuffer, fadeAndDisposeLoopLabVoice, startLoopLabVoice } from './loopLabPreviewVoice';

export function useOficinaLoopLabAudio() {
  const [selectedId, setSelectedId] = useState<LoopLabInstrumentId>('marcante');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [points, setPoints] = useState<BarulhoLoopPointsMs>(() => getEffectiveBarulhoLoopPoints('marcante'));
  const [playMode, setPlayMode] = useState<'none' | 'attack' | 'soft'>('none');
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  const activeVoiceRef = useRef<ActiveLoopLabVoice | null>(null);
  const activeBufferRef = useRef<AudioBuffer | null>(null);

  const stopPreview = useCallback(() => {
    fadeAndDisposeLoopLabVoice(activeVoiceRef.current, 0.035);
    activeVoiceRef.current = null;
    setPlayMode('none');
  }, []);

  const triggerVoice = useCallback((mode: 'attack' | 'soft', seamlessSwap = false) => {
    const buf = activeBufferRef.current;
    if (!buf) return;
    fadeAndDisposeLoopLabVoice(activeVoiceRef.current, seamlessSwap ? 0.025 : 0.020);
    const nextVoice = startLoopLabVoice(buf, selectedId, mode, seamlessSwap);
    activeVoiceRef.current = nextVoice;
    setPlayMode(nextVoice ? mode : 'none');
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;
    stopPreview();
    setAudioBuffer(null);
    activeBufferRef.current = null;
    decodeLoopLabAudioBuffer(resolveLoopSampleFilePath(selectedId))
      .then((buf) => {
        if (cancelled) return;
        activeBufferRef.current = buf;
        setAudioBuffer(buf);
        setPoints(getEffectiveBarulhoLoopPoints(selectedId, buf ? buf.duration * 1000 : undefined));
      })
      .catch(() => { if (!cancelled) setPoints(getEffectiveBarulhoLoopPoints(selectedId)); });
    return () => { cancelled = true; };
  }, [selectedId, stopPreview]);

  useEffect(() => () => { fadeAndDisposeLoopLabVoice(activeVoiceRef.current, 0.015); activeVoiceRef.current = null; }, []);

  const updatePointField = useCallback((field: keyof BarulhoLoopPointsMs, valueMs: number) => {
    const durMs = activeBufferRef.current ? activeBufferRef.current.duration * 1000 : undefined;
    const next = setBarulhoLoopOverride(selectedId, { ...points, [field]: valueMs }, durMs);
    setPoints(next);
    if (activeVoiceRef.current && playMode !== 'none') triggerVoice(playMode, true);
  }, [selectedId, points, playMode, triggerVoice]);

  const handleReset = useCallback(() => {
    const durMs = activeBufferRef.current ? activeBufferRef.current.duration * 1000 : undefined;
    resetBarulhoLoopOverride(selectedId);
    setPoints(getEffectiveBarulhoLoopPoints(selectedId, durMs));
    if (activeVoiceRef.current && playMode !== 'none') triggerVoice(playMode, true);
  }, [selectedId, playMode, triggerVoice]);

  const handleCopyJson = useCallback(() => {
    const payload = {
      instrument: selectedId, bankTier: getActiveLoopBankTier(selectedId),
      samplePath: resolveLoopSampleFilePath(selectedId),
      durationMs: activeBufferRef.current ? Math.round(activeBufferRef.current.duration * 1000) : null,
      activePoints: points, allSavedOverrides: loadAllLoopLabOverrides(),
    };
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).catch(() => {});
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 1800);
  }, [selectedId, points]);

  const getPlayheadMs = useCallback((): number | null => {
    const v = activeVoiceRef.current;
    if (!v) return null;
    const rawPos = v.entrySec + Math.max(0, v.ctx.currentTime - v.startedAtSec);
    const span = Math.max(0.02, v.loopWrapSec - v.loopResumeSec);
    const posSec = rawPos < v.loopWrapSec ? rawPos : v.loopResumeSec + ((rawPos - v.loopResumeSec) % span);
    return posSec * 1000;
  }, []);

  return {
    selectedId, setSelectedId, audioBuffer, points, playMode, copiedFeedback,
    bankTier: getActiveLoopBankTier(selectedId),
    startAttack: () => triggerVoice('attack', false),
    startSoft: () => triggerVoice('soft', false),
    stopPreview, updatePointField, handleReset, handleCopyJson, getPlayheadMs,
  };
}
