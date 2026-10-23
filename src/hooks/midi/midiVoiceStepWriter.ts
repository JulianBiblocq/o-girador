import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { resolveVoiceTargetTrackAndPattern } from './midiVoiceTargetResolver';

export function writeVoiceStepAndAdvance(targetNoteName: string): void {
  const seqStore = useSequencerStore.getState();
  const { targetTrack, targetPattern } = resolveVoiceTargetTrackAndPattern(seqStore);
  if (!targetTrack || !targetPattern) return;

  const targetInstId = instrumentsConfig[targetTrack?.instrumentIdx ?? -1]?.id;
  const isTargetCoro = targetInstId === 'coro' || String(targetTrack?.id).toLowerCase().includes('coro') || targetTrack?.customName?.toLowerCase().includes('coro');
  const effectiveVoiceSymbol: 'P' | 'C' = isTargetCoro ? 'C' : 'P';

  const patternSteps = targetPattern.steps || 16;
  let currentStepIdx = (seqStore.selectedStepIdx !== null && seqStore.selectedStepIdx !== undefined)
    ? seqStore.selectedStepIdx
    : 0;
  let isInPreRoll = Boolean(seqStore.selectedStepIsPreRoll);

  if (seqStore.selectedStepIdx === null || seqStore.selectedStepIdx === undefined) {
    currentStepIdx = 0;
    isInPreRoll = false;
    useSequencerStore.setState({
      selectedStepIdx: 0,
      selectedStepIsPreRoll: false,
      selectedSubIndex: null
    });
  }

  // Écriture pure sans réattaque sonore
  if (isInPreRoll) {
    const preRollNotes = [...(targetPattern.preRollNotes || Array(patternSteps).fill(''))];
    while (preRollNotes.length < patternSteps) preRollNotes.push('');
    preRollNotes[currentStepIdx] = targetNoteName;

    const preRollActiveSteps = [...(targetPattern.preRollActiveSteps || Array(patternSteps).fill('0'))];
    while (preRollActiveSteps.length < patternSteps) preRollActiveSteps.push('0');
    if (!preRollActiveSteps[currentStepIdx] || preRollActiveSteps[currentStepIdx] === 0 || preRollActiveSteps[currentStepIdx] === '0') {
      preRollActiveSteps[currentStepIdx] = effectiveVoiceSymbol;
    }

    const preRollLyrics = [...(targetPattern.preRollLyrics || Array(patternSteps).fill(''))];
    while (preRollLyrics.length < patternSteps) preRollLyrics.push('');
    const preRollDecays = targetPattern.preRollDecays ? [...targetPattern.preRollDecays] : Array(patternSteps).fill(10);
    while (preRollDecays.length < patternSteps) preRollDecays.push(10);
    const preRollVolumes = targetPattern.preRollVolumes ? [...targetPattern.preRollVolumes] : Array(patternSteps).fill(80);
    while (preRollVolumes.length < patternSteps) preRollVolumes.push(80);

    seqStore.setTracks((prev: any[]) => prev.map(t => {
      if (t.id === targetTrack.id || String(t.id) === String(targetTrack.id)) {
        return {
          ...t,
          patterns: t.patterns.map((p: any) => {
            if (p.id === targetPattern.id || String(p.id) === String(targetPattern.id)) {
              return { ...p, preRollNotes, preRollActiveSteps, preRollLyrics, preRollDecays, preRollVolumes };
            }
            return p;
          })
        };
      }
      return t;
    }));
  } else {
    const notes = [...(targetPattern.notes || Array(patternSteps).fill(''))];
    while (notes.length < patternSteps) notes.push('');
    notes[currentStepIdx] = targetNoteName;

    const activeSteps = [...(targetPattern.activeSteps || Array(patternSteps).fill('0'))];
    while (activeSteps.length < patternSteps) activeSteps.push('0');
    if (!activeSteps[currentStepIdx] || activeSteps[currentStepIdx] === 0 || activeSteps[currentStepIdx] === '0') {
      activeSteps[currentStepIdx] = effectiveVoiceSymbol;
    }

    const lyrics = [...(targetPattern.lyrics || Array(patternSteps).fill(''))];
    while (lyrics.length < patternSteps) lyrics.push('');

    seqStore.setTracks((prev: any[]) => prev.map(t => {
      if (t.id === targetTrack.id || String(t.id) === String(targetTrack.id)) {
        return {
          ...t,
          patterns: t.patterns.map((p: any) => {
            if (p.id === targetPattern.id || String(p.id) === String(targetPattern.id)) {
              return { ...p, notes, activeSteps, lyrics };
            }
            return p;
          })
        };
      }
      return t;
    }));
  }

  // Déplacement automatique de la sélection vers le pas suivant
  const timeSig = (targetPattern as any).timeSignature || seqStore.metadata?.ritmo || '4/4';
  const preRollStepsCount = targetPattern.preRollActiveSteps?.length || (timeSig === '12/8' ? 12 : 16);
  const nextStepIdx = isInPreRoll
    ? (currentStepIdx < preRollStepsCount - 1 ? currentStepIdx + 1 : 0)
    : ((currentStepIdx + 1) % patternSteps);
  const nextIsInPreRoll = isInPreRoll ? (currentStepIdx < preRollStepsCount - 1) : false;

  useSequencerStore.setState({
    selectedStepIdx: nextStepIdx,
    selectedStepIsPreRoll: nextIsInPreRoll,
    selectedSubIndex: null,
    selectedStepRange: null
  });

  // Animation WAAPI sur la cellule jouée
  try {
    const currentCard = document.querySelector<HTMLElement>(
      `[data-step-type="voice"][data-pattern-id="${targetPattern.id}"][data-step-index="${currentStepIdx}"]`
    ) || document.querySelector<HTMLElement>(`[data-step-type="voice"][data-step-index="${currentStepIdx}"]`);
    if (currentCard) {
      currentCard.animate([
        { transform: 'scale(1.08)', filter: 'brightness(1.3)' },
        { transform: 'scale(1)', filter: 'brightness(1)' }
      ], { duration: 180, easing: 'ease-out' });
    }
  } catch (_) {}

  window.dispatchEvent(new CustomEvent('focus-voice-step', {
    detail: { stepIdx: nextStepIdx, type: 'note', isInPreRoll: nextIsInPreRoll, patternId: targetPattern.id }
  }));
}
