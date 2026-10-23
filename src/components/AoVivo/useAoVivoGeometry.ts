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
      const handSpread = (isTimbal ? CONFIG_TIMBAL.handSpread : Math.min(width * 0.45, 550)) * scale;
      const xOffset = (isTimbal ? CONFIG_TIMBAL.targetXOffset : isDrum ? CONFIG_STICKS.spacing.targetXOffsetDrum : CONFIG_STICKS.spacing.targetXOffsetAlfaia) * scale;
      const strikeTargetY = isTimbal ? targetY - 40 * scale : isDrum || isAlfaia ? targetY - 75 * scale : targetY;

      if (leftWrapperRef.current) {
        const leftX = targetX - xOffset;
        const originLeftX = width / 2 - handSpread;
        const originLeftY = height + (280 * scale);
        const dLeftX = leftX - originLeftX;
        const dLeftY = strikeTargetY - originLeftY;
        const angleLeft = Math.atan2(dLeftY, dLeftX) * (180 / Math.PI) + 90;
        leftWrapperRef.current.style.left = `${originLeftX}px`;
        leftWrapperRef.current.style.height = `${Math.hypot(dLeftX, dLeftY)}px`;
        leftWrapperRef.current.style.transform = `translateX(-50%) rotate(${angleLeft}deg) scale(${scale})`;
      }

      if (rightWrapperRef.current) {
        const rightX = targetX + xOffset;
        const originRightX = width / 2 + handSpread;
        const originRightY = height + (280 * scale);
        const dRightX = rightX - originRightX;
        const dRightY = strikeTargetY - originRightY;
        const angleRight = Math.atan2(dRightY, dRightX) * (180 / Math.PI) + 90;
        rightWrapperRef.current.style.left = `${originRightX}px`;
        rightWrapperRef.current.style.height = `${Math.hypot(dRightX, dRightY)}px`;
        rightWrapperRef.current.style.transform = `translateX(-50%) rotate(${angleRight}deg) scale(${scale})`;
      }

      if (mineiroWrapperRef.current) {
        mineiroWrapperRef.current.style.left = `${targetX}px`;
        mineiroWrapperRef.current.style.top = `${targetY}px`;
        mineiroWrapperRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }

      if (agbeWrapperRef.current) {
        agbeWrapperRef.current.style.left = `${targetX}px`;
        agbeWrapperRef.current.style.top = `${targetY}px`;
        agbeWrapperRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }

      if (voiceWrapperRef.current) {
        voiceWrapperRef.current.style.left = `${targetX}px`;
        voiceWrapperRef.current.style.top = `${targetY}px`;
        voiceWrapperRef.current.style.transform = `scale(${scale})`;
      }

      if (flashRef.current) {
        flashRef.current.style.left = `${targetX}px`;
        flashRef.current.style.top = `${targetY}px`;
        flashRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }

      if (gongueWrapperRef.current) {
        const gongueSpread = Math.min(width * 0.15, 200) * scale;
        const offset = isLeftHanded ? -gongueSpread : gongueSpread;
        const originX = width / 2 + offset;
        const originY = height + (280 * scale);
        const dx = targetX - originX;
        const dy = (targetY - 30 * scale) - originY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        gongueWrapperRef.current.style.left = `${originX}px`;
        gongueWrapperRef.current.style.height = `${Math.hypot(dx, dy)}px`;
        gongueWrapperRef.current.style.transform = `translateX(-50%) rotate(${angle}deg) scale(${scale})`;
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
