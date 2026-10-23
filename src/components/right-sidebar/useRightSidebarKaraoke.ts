
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
    if (!visible || subTab !== 'toada') {
      activeTokensRef.current.forEach(el => {
        el.classList.remove('scale-110', 'cordel-border-sm', 'px-1');
        el.style.backgroundColor = 'transparent';
        el.style.color = 'var(--cordel-text)';
      });
      activeTokensRef.current = [];
      return;
    }

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number }) => {
      if (!karaokeContainerRef.current) {
        if (activeTokensRef.current.length > 0) {
          activeTokensRef.current.forEach(el => {
            el.classList.remove('scale-110');
            el.style.backgroundColor = 'transparent';
            el.style.color = 'var(--cordel-text)';
            el.style.boxShadow = 'none';
          });
          activeTokensRef.current = [];
        }
        return;
      }

      const { step, maxTicks } = detail;
      const totalMeasures = useSequencerStore.getState().totalMeasures || 1;
      const rawMeasure = useSequencerStore.getState().currentMeasure;
      const safeMeasure = Math.max(0, Math.min(rawMeasure, totalMeasures - 1));
      const currentTracks = useSequencerStore.getState().tracks;

      const puxTrack = currentTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coroTrack = currentTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
      const puxActivePattern = puxTrack?.patterns?.find(p => p.measureAssignments?.[safeMeasure]);
      const coroActivePattern = coroTrack?.patterns?.find(p => p.measureAssignments?.[safeMeasure]);

      const puxHasNotes = Boolean(puxActivePattern?.activeSteps && Object.values(puxActivePattern.activeSteps).some(v => v && v !== 0 && v !== '0'));
      const coroHasNotes = Boolean(coroActivePattern?.activeSteps && Object.values(coroActivePattern.activeSteps).some(v => v && v !== 0 && v !== '0'));

      const activePatternSteps = puxActivePattern?.steps || coroActivePattern?.steps || 16;
      let currentStep = -999;
      if ((detail as any).isPreRoll) {
        const preRollBeat = (detail as any).preRollBeat;
        const ratio = (detail as any).ratio || (step / maxTicks);
        const preRollStep = preRollBeat !== undefined ? Math.min(15, preRollBeat * 4 + Math.floor(ratio * 4)) : Math.min(15, Math.floor(ratio * 16));
        currentStep = preRollStep - 16;
      } else if (maxTicks > 0) {
        currentStep = Math.floor((step / maxTicks) * activePatternSteps);
      }

      let activeRole: 'puxador' | 'coro' | 'none' = 'none';
      if ((detail as any).isPreRoll) {
        const hasPuxPre = Boolean(puxActivePattern?.preRollActiveSteps && Object.values(puxActivePattern.preRollActiveSteps).some(v => v && v !== 0 && v !== '0'));
        const hasCoroPre = Boolean(coroActivePattern?.preRollActiveSteps && Object.values(coroActivePattern.preRollActiveSteps).some(v => v && v !== 0 && v !== '0'));
        if (hasPuxPre) activeRole = 'puxador';
        else if (hasCoroPre) activeRole = 'coro';
      } else {
        if (puxHasNotes && coroHasNotes) {
          const puxHit = Boolean(puxActivePattern?.activeSteps?.[currentStep] && puxActivePattern.activeSteps[currentStep] !== 0);
          const coroHit = Boolean(coroActivePattern?.activeSteps?.[currentStep] && coroActivePattern.activeSteps[currentStep] !== 0);
          if (puxHit && !coroHit) activeRole = 'puxador';
          else if (coroHit && !puxHit) activeRole = 'coro';
          else activeRole = 'puxador';
        } else if (puxHasNotes) {
          activeRole = 'puxador';
        } else if (coroHasNotes) {
          activeRole = 'coro';
        }
      }

      const puxBlock = karaokeContainerRef.current.querySelector<HTMLElement>('[data-role-block="puxador"]');
      const coroBlock = karaokeContainerRef.current.querySelector<HTMLElement>('[data-role-block="coro"]');
      if (puxBlock) puxBlock.style.opacity = activeRole === 'puxador' ? '1' : (activeRole === 'coro' ? '0.35' : '0.6');
      if (coroBlock) coroBlock.style.opacity = activeRole === 'coro' ? '1' : (activeRole === 'puxador' ? '0.35' : '0.6');

      activeTokensRef.current.forEach(el => {
        el.classList.remove('scale-110');
        el.style.backgroundColor = 'transparent';
        el.style.color = 'var(--cordel-text)';
        el.style.boxShadow = 'none';
      });
      activeTokensRef.current = [];

      if (activeRole === 'none') return;

      const targetPatternId = activeRole === 'puxador' ? puxActivePattern?.id : coroActivePattern?.id;
      const roleHighlightBg = activeRole === 'puxador' ? '#c25e38' : '#1e40af';
      const roleShadow = activeRole === 'puxador' ? '0 0 8px rgba(194, 94, 56, 0.6)' : '0 0 8px rgba(30, 64, 175, 0.6)';

      const roleTokens = karaokeContainerRef.current.querySelectorAll<HTMLElement>(`[data-karaoke-token][data-role="${activeRole}"]`);
      roleTokens.forEach(el => {
        const patternId = Number(el.dataset.patternId);
        const stepIdx = Number(el.dataset.stepIdx);
        if (targetPatternId !== undefined && patternId !== targetPatternId) return;

        if (stepIdx === currentStep) {
          el.classList.add('scale-110');
          el.style.backgroundColor = roleHighlightBg;
          el.style.color = '#ffffff';
          el.style.boxShadow = roleShadow;
          activeTokensRef.current.push(el);
        }
      });
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
      activeTokensRef.current.forEach(el => {
        el.classList.remove('scale-110');
        el.style.backgroundColor = 'transparent';
        el.style.color = 'var(--cordel-text)';
        el.style.boxShadow = 'none';
      });
      activeTokensRef.current = [];
    };
  }, [visible, subTab, karaokeContainerRef]);
}
