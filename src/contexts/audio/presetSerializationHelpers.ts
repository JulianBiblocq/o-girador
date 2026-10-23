/**
 * Helpers de restauration d'automations, transposition vocale et vigilance (< 60 lignes).
 */

import { useSequencerStore } from '../../stores/useSequencerStore';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';

export function restorePresetAutomationsAndVocal(p: any): void {
  const store = useSequencerStore.getState();

  // 1. Transposition vocale
  const targetTranspose = typeof p.vocalTransposeSteps === 'number' ? p.vocalTransposeSteps : 0;
  store.setVocalTransposeSteps(targetTranspose);

  // 2. Bypass d'automation Master et Global
  const isMasterBypassed = Boolean(p.isMasterVolumeBypassed);
  const globalBypass = p.globalAutomationBypass || { all: false, volume: false, pan: false, reverb: false };
  useSequencerStore.setState({
    isMasterVolumeBypassed: isMasterBypassed,
    globalAutomationBypass: globalBypass,
  });
}

export function restorePresetVigilancePoints(p: any): void {
  const rawVigilance = p.vigilancePoints || p.metadata?.vigilancePoints;
  if (Array.isArray(rawVigilance) && rawVigilance.length > 0) {
    const resolvedScoreId = p.id || p.metadata?.toada || 'preset';
    const normalizedPoints = rawVigilance.map((pt: any) => ({
      ...pt,
      scoreId: pt.scoreId || resolvedScoreId,
      id: pt.id && String(pt.id).includes('__') && pt.scoreId ? pt.id : `${resolvedScoreId}__${pt.sectionName}__${pt.roleKey}__${pt.stepIndex}`,
    }));
    usePaperVigilanceStore.setState({ points: normalizedPoints, activeFocusPoint: null, activeSequencerScoreId: resolvedScoreId });
  } else {
    usePaperVigilanceStore.getState().setActiveSequencerScoreId(null);
  }
}
