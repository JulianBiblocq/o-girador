import { useEffect, useRef } from 'react';
import { CONFIG_TIMBAL, CONFIG_STICKS } from '../../audio/animationGenerators';
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

      const rect = panel.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2 + 20;
      const width = window.innerWidth;
      const height = window.innerHeight;
      geometryRef.current = { targetX, targetY, width, height };

      if (!activeTrack) return;
      const instId = activeTrack.instrumentIdx !== undefined ? instrumentsConfig[activeTrack.instrumentIdx]?.id : null;
      const isTimbal = instId === 'timbal';
      const isDrum = instId === 'caixa' || instId === 'tarol';
      const handSpread = isTimbal ? CONFIG_TIMBAL.handSpread : Math.min(width * 0.45, 550);
      const xOffset = isTimbal ? CONFIG_TIMBAL.targetXOffset : isDrum ? CONFIG_STICKS.spacing.targetXOffsetDrum : CONFIG_STICKS.spacing.targetXOffsetAlfaia;

      if (leftWrapperRef.current) {
        const leftX = targetX - xOffset;
        const originLeftX = width / 2 - handSpread;
        const originLeftY = height + 350;
        const dLeftX = leftX - originLeftX;
        const dLeftY = targetY - originLeftY;
        const angleLeft = Math.atan2(dLeftY, dLeftX) * (180 / Math.PI) + 90;
        leftWrapperRef.current.style.left = `${originLeftX}px`;
        leftWrapperRef.current.style.height = `${Math.hypot(dLeftX, dLeftY)}px`;
        leftWrapperRef.current.style.transform = `translateX(-50%) rotate(${angleLeft}deg)`;
      }

      if (rightWrapperRef.current) {
        const rightX = targetX + xOffset;
        const originRightX = width / 2 + handSpread;
        const originRightY = height + 350;
        const dRightX = rightX - originRightX;
        const dRightY = targetY - originRightY;
        const angleRight = Math.atan2(dRightY, dRightX) * (180 / Math.PI) + 90;
        rightWrapperRef.current.style.left = `${originRightX}px`;
        rightWrapperRef.current.style.height = `${Math.hypot(dRightX, dRightY)}px`;
        rightWrapperRef.current.style.transform = `translateX(-50%) rotate(${angleRight}deg)`;
      }

      if (mineiroWrapperRef.current) {
        const offsetVal = width < 400 ? 50 : width < 640 ? 80 : 120;
        mineiroWrapperRef.current.style.left = `${targetX}px`;
        mineiroWrapperRef.current.style.top = `${targetY - offsetVal}px`;
      }

      if (agbeWrapperRef.current) {
        agbeWrapperRef.current.style.left = `${targetX}px`;
        agbeWrapperRef.current.style.top = `${targetY - 20}px`;
      }

      if (voiceWrapperRef.current) {
        voiceWrapperRef.current.style.left = `${targetX}px`;
        voiceWrapperRef.current.style.top = `${targetY}px`;
      }

      if (flashRef.current) {
        flashRef.current.style.left = `${targetX}px`;
        flashRef.current.style.top = `${targetY}px`;
      }

      if (gongueWrapperRef.current) {
        const gongueSpread = Math.min(width * 0.15, 200);
        const offset = isLeftHanded ? -gongueSpread : gongueSpread;
        const originX = width / 2 + offset;
        const originY = height + 350;
        const dx = targetX - originX;
        const dy = (targetY - 30) - originY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        gongueWrapperRef.current.style.left = `${originX}px`;
        gongueWrapperRef.current.style.height = `${Math.hypot(dx, dy)}px`;
        gongueWrapperRef.current.style.transform = `translateX(-50%) rotate(${angle}deg)`;
      }
    };

    updateGeometry();
    const panel = document.getElementById('circle-sequencer-panel');
    if (!panel) return;

    const resizeObserver = new ResizeObserver(() => updateGeometry());
    resizeObserver.observe(panel);
    window.addEventListener('resize', updateGeometry);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateGeometry);
    };
  }, [activeAoVivoTrackId, isLeftHanded, activeTrack, leftWrapperRef, rightWrapperRef, mineiroWrapperRef, agbeWrapperRef, voiceWrapperRef, flashRef, gongueWrapperRef]);

  return { geometryRef };
}
