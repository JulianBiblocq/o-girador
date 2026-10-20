import { instrumentsConfig } from '../../data';

export const isVoiceTrack = (t?: any): boolean => {
  if (!t) return false;
  const inst = instrumentsConfig[t.instrumentIdx];
  return (
    t.id === 'toada' ||
    t.id === 'puxador' ||
    t.id === 'coro' ||
    t.type === 'voice' ||
    inst?.type === 'voice' ||
    inst?.id === 'puxador' ||
    inst?.id === 'coro' ||
    inst?.id === 'toada' ||
    t.customName === 'Toada' ||
    t.customName === 'Puxador' ||
    t.customName === 'Coro'
  );
};

export function detectVoiceContext(seqStore: any): { isVoiceContext: boolean; activeTrack: any } {
  const editingTrackId = seqStore.editingTrackId;
  const editingTrack = seqStore.tracks.find((t: any) => t.id === editingTrackId || String(t.id) === String(editingTrackId));
  const isEditingVoice = isVoiceTrack(editingTrack);
  const armedTrack = seqStore.tracks.find((t: any) => t.id === seqStore.armedTrackId || String(t.id) === String(seqStore.armedTrackId));

  const activeTrack = isEditingVoice && editingTrack 
    ? editingTrack 
    : (editingTrack ?? armedTrack ?? null);

  const hasVoiceEditorInDom = typeof document !== 'undefined' && Boolean(
    document.querySelector('[data-voice-piano-dock]') ||
    document.querySelector('[data-instrument-detail-editor="voice"]') ||
    (window as any).oGiradorVocalEditorOpen
  );

  const isVoiceContext = Boolean(
    (activeTrack as any)?.type === 'voice' || 
    String(activeTrack?.id) === 'toada' || 
    String(activeTrack?.id) === 'puxador' || 
    String(activeTrack?.id) === 'coro' ||
    String(activeTrack?.id).toLowerCase().includes('toada') ||
    String(activeTrack?.id).toLowerCase().includes('puxador') ||
    String(activeTrack?.id).toLowerCase().includes('coro') ||
    activeTrack?.customName === 'Toada' ||
    activeTrack?.customName === 'Puxador' ||
    activeTrack?.customName === 'Coro' ||
    isEditingVoice ||
    isVoiceTrack(activeTrack) ||
    hasVoiceEditorInDom
  );

  return { isVoiceContext, activeTrack };
}
