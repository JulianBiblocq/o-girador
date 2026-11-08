import { useEffect, useRef } from 'react';
import { CONFIG_ALFAIA_STICKS, subscribeAlfaiaSticksConfig } from '../../audio/animations/alfaiaKinematics';
import { getEffectiveMobileOffset, subscribeMobileOffsets } from '../../audio/animations/aoVivoMobileOffsets';
import { CONFIG_CAIXA_STICKS, subscribeCaixaSticksConfig } from '../../audio/animations/caixaKinematics';
import { subscribeGongueStickConfig } from '../../audio/animations/gongueKinematics';
import { CONFIG_TIMBAL_HANDS, subscribeTimbalHandsConfig } from '../../audio/animations/timbalKinematics';
import { instrumentsConfig } from '../../data';

export function useAoVivoGeometry(
  activeAoVivoTrackId: string | number,
  isLeftHanded: boolean,
  activeTrack: any,
  leftWrapperRef: React.RefObject<HTMLDivElement | null>,
  rightWrapperRef: React.RefObject<HTMLDivElement | null>,
  mineiroWrapperRef: React.RefObject<HTMLDivElement | null>,
  agbeWrapperRef: React.RefObject<HTMLDivElement | null>,
  voiceWrapperRef: React.RefObject<HTMLDivElement | null>,
  flashRef: React.RefObject<HTMLDivElement | null>,
  gongueWrapperRef: React.RefObject<HTMLDivElement | null>
) {
  const geometryRef = useRef({ targetX: 0, targetY: 0, width: 0, height: 0 });

  useEffect(() => {
    const updateGeometry = () => {
      const panel = document.getElementById('circle-sequencer-panel');
      if (!panel) return;

      const width = panel.clientWidth || window.innerWidth;
      const height = panel.clientHeight || window.innerHeight;
      const targetX = width / 2;
      const targetY = height / 2 + 10;
      geometryRef.current = { targetX, targetY, width, height };

      const canvas = panel.querySelector('canvas');
      const rodaDiameter = canvas ? canvas.clientWidth : Math.min(width, height) * 0.85;
      const scale = Math.min(1, Math.max(0.4, rodaDiameter / 520));

      if (!activeTrack) return;
      const instId = activeTrack.instrumentIdx !== undefined ? instrumentsConfig[activeTrack.instrumentIdx]?.id : null;
      const isTimbal = instId === 'timbal';
      const isDrum = instId === 'caixa' || instId === 'tarol';
      const isAlfaia = instId === 'marcante' || instId === 'meiao' || instId === 'repique';
      const mob = getEffectiveMobileOffset(instId);

      const applyStickWrapper = (el: HTMLDivElement | null, isLeft: boolean) => {
        if (!el) return;
        const sign = isLeft ? -1 : 1;
        if (isAlfaia || isDrum || isTimbal) {
          const stickAngleDeg = isAlfaia
            ? CONFIG_ALFAIA_STICKS.stickAngleDeg
            : isDrum
              ? CONFIG_CAIXA_STICKS.stickAngleDeg
              : CONFIG_TIMBAL_HANDS.anatomy.vShapeAngleDeg;
          const stickSpreadPx = (isAlfaia
            ? CONFIG_ALFAIA_STICKS.stickSpreadPx
            : isDrum
              ? CONFIG_CAIXA_STICKS.stickSpreadPx
              : CONFIG_TIMBAL_HANDS.anatomy.handSpreadPx) + mob.spreadDeltaPx;
          const effScale = scale * mob.scaleMult;
          const originX = targetX + mob.offsetX + sign * (rodaDiameter * 0.12 + stickSpreadPx * scale);
          const originY = targetY + mob.offsetY + rodaDiameter * 0.44;
          const restHeadX = targetX + mob.offsetX + sign * stickSpreadPx * scale;
          const restHeadY = targetY + mob.offsetY + rodaDiameter * 0.09;
          el.style.left = `${originX}px`;
          el.style.bottom = `${height - originY}px`;
          el.style.height = `${Math.hypot(restHeadX - originX, restHeadY - originY)}px`;
          el.style.transform = `translateX(-50%) rotate(${isLeft ? stickAngleDeg : -stickAngleDeg}deg) scale(${effScale})`;
        }
      };

      applyStickWrapper(leftWrapperRef.current, true);
      applyStickWrapper(rightWrapperRef.current, false);

      const centerEl = (el: HTMLDivElement | null, useTranslate = true, applyMob = false) => {
        if (!el) return;
        const cx = applyMob ? targetX + mob.offsetX + mob.spreadDeltaPx * 0.5 : targetX;
        const cy = applyMob ? targetY + mob.offsetY + mob.reachDeltaY : targetY;
        const sc = applyMob ? scale * mob.scaleMult : scale;
        el.style.left = `${cx}px`;
        el.style.top = `${cy}px`;
        el.style.transform = useTranslate ? `translate(-50%, -50%) scale(${sc})` : `scale(${sc})`;
      };
      centerEl(mineiroWrapperRef.current, true, true);
      centerEl(agbeWrapperRef.current, true, true);
      centerEl(voiceWrapperRef.current, false, false);
      centerEl(flashRef.current, true, false);
      centerEl(gongueWrapperRef.current, true, true);
    };

    updateGeometry();
    const panel = document.getElementById('circle-sequencer-panel');
    if (!panel) return;

    const resizeObserver = new ResizeObserver(() => updateGeometry());
    resizeObserver.observe(panel);
    window.addEventListener('resize', updateGeometry);
    const u1 = subscribeAlfaiaSticksConfig(() => updateGeometry());
    const u2 = subscribeCaixaSticksConfig(() => updateGeometry());
    const u3 = subscribeGongueStickConfig(() => updateGeometry());
    const u4 = subscribeTimbalHandsConfig(() => updateGeometry());
    const u5 = subscribeMobileOffsets(() => updateGeometry());
    return () => {
      u1(); u2(); u3(); u4(); u5();
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateGeometry);
    };
  }, [activeAoVivoTrackId, isLeftHanded, activeTrack, leftWrapperRef, rightWrapperRef, mineiroWrapperRef, agbeWrapperRef, voiceWrapperRef, flashRef, gongueWrapperRef]);

  return { geometryRef };
}
