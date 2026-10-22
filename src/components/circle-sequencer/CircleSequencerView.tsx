/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ASSETS_BASE_URL } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { CircleInfoBadges } from './CircleInfoBadges';
import { CircleCenterOverlay } from './CircleCenterOverlay';
import { CircleVocalToolbar } from './CircleVocalToolbar';

interface CircleSequencerViewProps {
  state: any;
}

export const CircleSequencerView: React.FC<CircleSequencerViewProps> = ({ state }) => {
  const {
    isActive, isPlaying, lang, timeSig, activeBpm, activeVol,
    canvasRef, centerOverlayRef,
    centerAfficheurRef, centerOverlayImgRef, centerOverlayTintRef, centerOverlayTextRef,
    isCenterShaking, isLetraActive, toggleLetraActive, vocalMode, setVocalMode,
    handleCanvasPointerDown, handleCanvasPointerMove, isMobile,
  } = state;
  const mobileViewMode = useSequencerStore((s) => s.mobileViewMode);

  return (
    <div
      id="circle-sequencer-panel"
      className="flex-grow flex items-center justify-center bg-[var(--cordel-bg)] relative p-2.5 overflow-hidden w-full h-full select-none"
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      {/* Texture d'arrière-plan asynchrone adaptée au mode clair (traits noirs sur papier) et sombre (traits blancs) */}
      <div
        className="absolute inset-0 pointer-events-none bg-cover bg-center bg-no-repeat select-none z-0 invert mix-blend-multiply opacity-20 dark:invert-0 dark:opacity-25 dark:mix-blend-normal"
        style={{
          backgroundImage: `url(${ASSETS_BASE_URL}Pictures/atelier.png)`,
        }}
        aria-hidden="true"
      />

      {!isMobile && (
        <CircleInfoBadges
          timeSig={timeSig}
          activeBpm={activeBpm}
          activeVol={activeVol}
          lang={lang}
          hideBpmBadge={mobileViewMode === 'percussion'}
          hideFormulaBadge={true}
        />
      )}

      <div className="flex-1 min-h-0 relative w-full h-full max-w-[800px] max-h-[calc(100%-20px)] mx-auto flex items-center justify-center py-3">
        <canvas
          ref={canvasRef}
          width={1200}
          height={1200}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          className={`max-w-full max-h-full aspect-square cursor-pointer block select-none ${isPlaying ? 'pointer-events-none' : ''}`}
          style={{ touchAction: 'none' }}
          role="application"
          aria-label={lang === 'pt' ? 'Roda de maracatu — sequenciador circular' : 'Roda de maracatu — sequenciador circular'}
        />

        <CircleCenterOverlay
          centerOverlayRef={centerOverlayRef}
          centerAfficheurRef={centerAfficheurRef}
          centerOverlayImgRef={centerOverlayImgRef}
          centerOverlayTintRef={centerOverlayTintRef}
          centerOverlayTextRef={centerOverlayTextRef}
          isCenterShaking={isCenterShaking}
          isLetraActive={isLetraActive}
        />
      </div>

      {!isMobile && (
        <CircleVocalToolbar
          isLetraActive={isLetraActive}
          toggleLetraActive={toggleLetraActive}
          vocalMode={vocalMode}
          setVocalMode={setVocalMode}
          lang={lang}
        />
      )}
    </div>
  );
};
