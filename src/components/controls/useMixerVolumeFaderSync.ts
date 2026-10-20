import React, { useRef, useEffect } from 'react';
import { faderPositionToDbString, UNITY_GAIN_FADER_POSITION } from '../../utils/audioMath';
import { useFaderTouchDrag } from './useFaderTouchDrag';
import { useFaderMidiAndAudio } from './useFaderMidiAndAudio';

interface UseMixerVolumeFaderSyncProps {
  trackId?: number;
  value: number;
  defaultValue?: number;
  onChange: (val: number) => void;
  onAudioDrag?: (val: number) => void;
  isMaster?: boolean;
  trackAreaHeight: number;
  resolvedThumbHeight: number;
  topPadding: number;
  bottomPadding: number;
  travelRange: number;
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
  trackAreaHeight,
  resolvedThumbHeight,
  topPadding,
  bottomPadding,
  travelRange,
  visualThumbRef,
  valueTextRef,
  isEditing,
  setIsEditing,
}: UseMixerVolumeFaderSyncProps) {
  const isDraggingRef = useRef(false);
  const rectRef = useRef<DOMRect | null>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);

  const getTopPosition = (val: number) => {
    const ratio = 1 - Math.max(0, Math.min(100, val)) / 100;
    return ratio * travelRange + topPadding;
  };

  const { updateAudioNode } = useFaderMidiAndAudio({
    trackId, isMaster, getTopPosition, visualThumbRef, valueTextRef, onAudioDrag
  });

  const resetToUnity = (e?: React.SyntheticEvent | Event) => {
    if (e) {
      if (typeof (e as any).preventDefault === 'function') (e as any).preventDefault();
      if (typeof (e as any).stopPropagation === 'function') (e as any).stopPropagation();
    }
    setIsEditing(false);
    const unityPos = defaultValue !== undefined ? defaultValue : UNITY_GAIN_FADER_POSITION;
    const topPx = getTopPosition(unityPos);
    if (visualThumbRef.current) visualThumbRef.current.style.top = `${topPx}px`;
    if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(unityPos);
    updateAudioNode(unityPos);
    onChange(unityPos);
  };

  const calculateValueFromPointer = (clientY: number) => {
    const rect = rectRef.current;
    if (!rect) return value;
    const relativeY = clientY - rect.top;
    const startY = topPadding + resolvedThumbHeight / 2;
    const endY = trackAreaHeight - bottomPadding - resolvedThumbHeight / 2;
    const totalTravel = endY - startY;
    if (totalTravel <= 0) return 0;
    let ratio = Math.min(1, Math.max(0, (relativeY - startY) / totalTravel));
    return Math.round((1 - ratio) * 100);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    if (trackAreaRef.current) rectRef.current = trackAreaRef.current.getBoundingClientRect();
    const val = calculateValueFromPointer(e.clientY);
    const topPx = getTopPosition(val);
    if (visualThumbRef.current) visualThumbRef.current.style.top = `${topPx}px`;
    if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(val);
    updateAudioNode(val);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const val = calculateValueFromPointer(e.clientY);
    const topPx = getTopPosition(val);
    if (visualThumbRef.current) visualThumbRef.current.style.top = `${topPx}px`;
    if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(val);
    updateAudioNode(val);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    const val = calculateValueFromPointer(e.clientY);
    updateAudioNode(val);
    onChange(val);
  };

  useFaderTouchDrag({
    trackAreaRef, calculateValueFromPointer, getTopPosition,
    visualThumbRef, valueTextRef, updateAudioNode, onChange,
    resetToUnity, trackAreaHeight
  });

  useEffect(() => {
    if (!isDraggingRef.current && !isEditing) {
      const activeVal = value ?? defaultValue ?? UNITY_GAIN_FADER_POSITION;
      const topPx = getTopPosition(activeVal);
      if (visualThumbRef.current) visualThumbRef.current.style.top = `${topPx}px`;
      if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(activeVal);
      updateAudioNode(activeVal);
    }
  }, [value, defaultValue, trackId, trackAreaHeight, isEditing]);

  return {
    trackAreaRef,
    getTopPosition,
    updateAudioNode,
    resetToUnity,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
