import React, { useRef, useEffect, useCallback } from 'react';
import { faderPositionToDbString, sanitizeFaderPosition, UNITY_GAIN_FADER_POSITION } from '../../utils/audioMath';
import { useFaderTouchDrag } from './useFaderTouchDrag';
import { useFaderMidiAndAudio } from './useFaderMidiAndAudio';

interface UseMixerVolumeFaderSyncProps {
  trackId?: number;
  value: number;
  defaultValue?: number;
  onChange: (val: number) => void;
  onAudioDrag?: (val: number) => void;
  isMaster?: boolean;
  visualThumbRef: React.MutableRefObject<HTMLDivElement | null>;
  valueTextRef: React.MutableRefObject<HTMLSpanElement | null>;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
}

export function useMixerVolumeFaderSync({
  trackId,
  value,
  defaultValue = UNITY_GAIN_FADER_POSITION,
  onChange,
  onAudioDrag,
  isMaster = false,
  visualThumbRef,
  valueTextRef,
  isEditing,
  setIsEditing,
}: UseMixerVolumeFaderSyncProps) {
  const isDraggingRef = useRef(false);
  const railRef = useRef<HTMLDivElement>(null);
  const railRectRef = useRef<DOMRect | null>(null);

  const cacheRailRect = useCallback(() => {
    railRectRef.current = railRef.current?.getBoundingClientRect() || null;
    return railRectRef.current;
  }, []);

  const clearRailRect = useCallback(() => {
    railRectRef.current = null;
  }, []);

  const { updateAudioNode } = useFaderMidiAndAudio({
    trackId, isMaster, visualThumbRef, valueTextRef, onAudioDrag
  });

  const calculateValueFromPointer = (clientY: number) => {
    const rect = railRectRef.current || cacheRailRect();
    if (!rect || rect.height <= 0) return sanitizeFaderPosition(value);
    const ratio = (rect.bottom - clientY) / rect.height;
    return Math.max(0, Math.min(100, Math.round(ratio * 1000) / 10));
  };

  const resetToUnity = (e?: React.SyntheticEvent | Event) => {
    if (e) {
      if (typeof (e as any).preventDefault === 'function') (e as any).preventDefault();
      if (typeof (e as any).stopPropagation === 'function') (e as any).stopPropagation();
    }
    setIsEditing(false);
    clearRailRect();
    const unityPos = defaultValue !== undefined ? defaultValue : UNITY_GAIN_FADER_POSITION;
    if (visualThumbRef.current) visualThumbRef.current.style.bottom = `${unityPos}%`;
    if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(unityPos);
    updateAudioNode(unityPos);
    onChange(unityPos);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    cacheRailRect();
    const val = calculateValueFromPointer(e.clientY);
    if (visualThumbRef.current) visualThumbRef.current.style.bottom = `${val}%`;
    if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(val);
    updateAudioNode(val);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const val = calculateValueFromPointer(e.clientY);
    if (visualThumbRef.current) visualThumbRef.current.style.bottom = `${val}%`;
    if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(val);
    updateAudioNode(val);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    const val = calculateValueFromPointer(e.clientY);
    clearRailRect();
    updateAudioNode(val);
    onChange(val);
  };

  useFaderTouchDrag({
    railRef, calculateValueFromPointer, cacheRailRect, clearRailRect,
    visualThumbRef, valueTextRef, updateAudioNode, onChange, resetToUnity
  });

  useEffect(() => {
    if (!isDraggingRef.current && !isEditing) {
      const activeVal = sanitizeFaderPosition(value ?? defaultValue ?? UNITY_GAIN_FADER_POSITION);
      if (visualThumbRef.current) visualThumbRef.current.style.bottom = `${activeVal}%`;
      if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(activeVal);
      updateAudioNode(activeVal);
    }
  }, [value, defaultValue, trackId, isEditing]);

  return {
    railRef,
    updateAudioNode,
    resetToUnity,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
