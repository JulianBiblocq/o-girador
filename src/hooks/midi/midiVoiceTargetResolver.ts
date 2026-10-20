import { useAudioStore } from '../../stores/useAudioStore';
import { isToadaChild } from '../../stores/useSequencerStore';
import { isVoiceTrack } from './midiContextUtils';

export function resolveVoiceTargetTrackAndPattern(seqStore: any): { targetTrack: any; targetPattern: any } {
  const editingTrackId = seqStore.editingTrackId;
  const editingTrack = seqStore.tracks.find((t: any) => t.id === editingTrackId);

  let activeTrack = editingTrack && isVoiceTrack(editingTrack)
    ? editingTrack
    : seqStore.tracks.find((t: any) => isVoiceTrack(t));

  let targetTrack: any = null;
  let targetPattern: any = null;

  // 1. Priorité DOM : élément actif ou cellule focalisée portant data-pattern-id
  if (typeof document !== 'undefined') {
    const activeEl = document.activeElement;
    const focusedCell = activeEl?.closest('[data-pattern-id]');
    const activePatternId = focusedCell?.getAttribute('data-pattern-id');
    const activeTrackId = focusedCell?.getAttribute('data-track-id');
    if (activePatternId) {
      targetTrack = seqStore.tracks.find((t: any) => (activeTrackId && String(t.id) === String(activeTrackId)) || t.patterns.some((p: any) => String(p.id) === String(activePatternId)));
      targetPattern = targetTrack?.patterns.find((p: any) => String(p.id) === String(activePatternId));
    }

    // 2. Priorité DOM : cellule vocale sélectionnée
    if (!targetPattern) {
      const selectedStepCell = document.querySelector<HTMLElement>('[data-step-type="voice"][data-selected="true"]');
      if (selectedStepCell) {
        const pId = selectedStepCell.getAttribute('data-pattern-id');
        const tId = selectedStepCell.getAttribute('data-track-id');
        if (pId) {
          targetTrack = seqStore.tracks.find((t: any) => (tId && String(t.id) === String(tId)) || t.patterns.some((p: any) => String(p.id) === String(pId)));
          targetPattern = targetTrack?.patterns.find((p: any) => String(p.id) === String(pId));
        }
      }
    }

    // 3. Priorité DOM : carte de motif active/sélectionnée
    if (!targetPattern) {
      const activeDomCard = document.querySelector<HTMLElement>('[data-pattern-card][data-selected="true"]');
      if (activeDomCard) {
        const pId = activeDomCard.getAttribute('data-pattern-card');
        if (pId) {
          targetTrack = seqStore.tracks.find((t: any) => t.patterns.some((p: any) => String(p.id) === String(pId)));
          targetPattern = targetTrack?.patterns.find((p: any) => String(p.id) === String(pId));
        }
      }
    }
  }

  // 4. Contexte d'édition : editingTrackId (priorise selectedPatternId)
  if (!targetPattern && editingTrackId !== null && editingTrackId !== undefined) {
    const trk = seqStore.tracks.find((t: any) => t.id === editingTrackId || String(t.id) === String(editingTrackId));
    if (trk) {
      if (trk.patterns && trk.patterns.length > 0) {
        targetTrack = trk;
        targetPattern = trk.patterns.find((p: any) => p.id === trk.selectedPatternId);
      } else {
        const children = seqStore.tracks.filter((t: any) => String(t.busId) === String(trk.id) || isToadaChild(t, seqStore.tracks));
        for (const child of children) {
          if (child.patterns && child.patterns.length > 0) {
            targetTrack = child;
            targetPattern = child.patterns.find((p: any) => p.id === child.selectedPatternId);
            if (targetPattern) break;
          }
        }
      }
    }
  }

  // 5. AudioStore : selectedVocalPatternId
  if (!targetPattern) {
    const vocalPtnId = useAudioStore.getState().selectedVocalPatternId;
    if (vocalPtnId) {
      targetTrack = seqStore.tracks.find((t: any) => t.patterns.some((p: any) => p.id === vocalPtnId || String(p.id) === String(vocalPtnId)));
      targetPattern = targetTrack?.patterns.find((p: any) => p.id === vocalPtnId || String(p.id) === String(vocalPtnId));
    }
  }

  // 6. Repli sécurisé
  if (!targetPattern && targetTrack?.patterns?.length > 0) {
    targetPattern = targetTrack.patterns.find((p: any) => p.id === targetTrack.selectedPatternId) || targetTrack.patterns[0];
  }

  if (!targetPattern && activeTrack) {
    if (activeTrack.patterns?.length > 0) {
      targetTrack = activeTrack;
      targetPattern = activeTrack.patterns.find((p: any) => p.id === activeTrack.selectedPatternId) || activeTrack.patterns[0];
    } else {
      const children = seqStore.tracks.filter((t: any) => String(t.busId) === String(activeTrack.id) || isToadaChild(t, seqStore.tracks));
      for (const child of children) {
        if (child.patterns?.length > 0) {
          targetTrack = child;
          targetPattern = child.patterns.find((p: any) => p.id === child.selectedPatternId) || child.patterns[0];
          break;
        }
      }
    }
  }

  return { targetTrack, targetPattern };
}
