import React from 'react';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';

export function useRightSidebarKaraoke(
  visible: boolean,
  subTab: string,
  karaokeContainerRef: React.RefObject<HTMLDivElement | null>
) {
  const activeTokensRef = React.useRef<HTMLElement[]>([]);

  React.useEffect(() => {
    const clearActiveTokens = () => {
      activeTokensRef.current.forEach((el) => {
        el.classList.remove('scale-110', 'cordel-border-sm', 'px-1');
        el.style.backgroundColor = 'transparent';
        el.style.color = 'var(--cordel-text)';
        el.style.boxShadow = 'none';
      });
      activeTokensRef.current = [];
    };

    if (!visible || subTab !== 'toada') {
      clearActiveTokens();
      return;
    }

    let lastStepKey = '';

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number; isPreRoll?: boolean; preRollBeat?: number }) => {
      const container = karaokeContainerRef.current;
      if (!container) {
        if (activeTokensRef.current.length > 0) clearActiveTokens();
        lastStepKey = '';
        return;
      }

      const { step, maxTicks } = detail;
      const st = useSequencerStore.getState();
      const totalMeasures = st.totalMeasures || 1;
      const rawMeasure = typeof detail.measure === 'number' ? detail.measure : st.currentMeasure;
      const safeMeasure = Math.max(0, Math.min(rawMeasure, totalMeasures - 1));
      const currentTracks = st.tracks;

      const puxTrack = currentTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coroTrack = currentTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
      const puxActivePattern = puxTrack?.patterns?.find((p) => p.measureAssignments?.[safeMeasure]);
      const coroActivePattern = coroTrack?.patterns?.find((p) => p.measureAssignments?.[safeMeasure]);

      const activePatternSteps = puxActivePattern?.steps || coroActivePattern?.steps || 16;
      let currentStep = -999;
      if (detail.isPreRoll) {
        const preRollBeat = detail.preRollBeat;
        const ratio = detail.ratio || (step / maxTicks);
        const preRollStep = preRollBeat !== undefined ? Math.min(15, preRollBeat * 4 + Math.floor(ratio * 4)) : Math.min(15, Math.floor(ratio * 16));
        currentStep = preRollStep - 16;
      } else if (step >= 0 && maxTicks > 0) {
        currentStep = Math.floor((step / maxTicks) * activePatternSteps);
      }

      const stepKey = `${safeMeasure}:${currentStep}:${detail.isPreRoll ? 1 : 0}:${puxActivePattern?.id ?? 0}:${coroActivePattern?.id ?? 0}`;
      if (stepKey === lastStepKey) return;
      lastStepKey = stepKey;

      const puxHasNotes = Boolean(puxActivePattern?.activeSteps && Object.values(puxActivePattern.activeSteps).some((v) => v && v !== 0 && v !== '0'));
      const coroHasNotes = Boolean(coroActivePattern?.activeSteps && Object.values(coroActivePattern.activeSteps).some((v) => v && v !== 0 && v !== '0'));

      let activeRole: 'puxador' | 'coro' | 'none' = 'none';
      if (detail.isPreRoll) {
        const hasPuxPre = Boolean(puxActivePattern?.preRollActiveSteps && Object.values(puxActivePattern.preRollActiveSteps).some((v) => v && v !== 0 && v !== '0'));
        const hasCoroPre = Boolean(coroActivePattern?.preRollActiveSteps && Object.values(coroActivePattern.preRollActiveSteps).some((v) => v && v !== 0 && v !== '0'));
        if (hasPuxPre) activeRole = 'puxador';
        else if (hasCoroPre) activeRole = 'coro';
      } else if (step >= 0) {
        if (puxHasNotes && coroHasNotes) {
          const puxHit = Boolean(puxActivePattern?.activeSteps?.[currentStep] && puxActivePattern.activeSteps[currentStep] !== 0);
          const coroHit = Boolean(coroActivePattern?.activeSteps?.[currentStep] && coroActivePattern.activeSteps[currentStep] !== 0);
          activeRole = coroHit && !puxHit ? 'coro' : 'puxador';
        } else if (puxHasNotes) activeRole = 'puxador';
        else if (coroHasNotes) activeRole = 'coro';
      }

      const puxBlock = container.querySelector<HTMLElement>('[data-role-block="puxador"]');
      const coroBlock = container.querySelector<HTMLElement>('[data-role-block="coro"]');
      if (puxBlock) puxBlock.style.opacity = activeRole === 'puxador' ? '1' : (activeRole === 'coro' ? '0.35' : '0.6');
      if (coroBlock) coroBlock.style.opacity = activeRole === 'coro' ? '1' : (activeRole === 'puxador' ? '0.35' : '0.6');

      clearActiveTokens();
      if (activeRole === 'none') return;

      const targetPatternId = activeRole === 'puxador' ? puxActivePattern?.id : coroActivePattern?.id;
      const roleHighlightBg = activeRole === 'puxador' ? '#c25e38' : '#1e40af';
      const roleTokens = container.querySelectorAll<HTMLElement>(`[data-karaoke-token][data-role="${activeRole}"]`);
      roleTokens.forEach((el) => {
        const patternId = Number(el.dataset.patternId);
        const stepIdx = Number(el.dataset.stepIdx);
        const endStepIdx = el.dataset.endStepIdx !== undefined ? Number(el.dataset.endStepIdx) : stepIdx;
        if (targetPatternId !== undefined && patternId !== targetPatternId) return;
        if (currentStep >= stepIdx && currentStep <= endStepIdx) {
          el.classList.add('scale-110');
          el.style.backgroundColor = roleHighlightBg;
          el.style.color = '#ffffff';
          activeTokensRef.current.push(el);
        }
      });
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
      clearActiveTokens();
    };
  }, [visible, subTab, karaokeContainerRef]);
}
