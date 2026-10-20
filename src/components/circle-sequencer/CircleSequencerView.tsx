/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CircleNavigationHeader } from './CircleNavigationHeader';
import { CircleInfoBadges } from './CircleInfoBadges';
import { CircleCenterOverlay } from './CircleCenterOverlay';
import { CircleVocalToolbar } from './CircleVocalToolbar';

interface CircleSequencerViewProps {
  state: any;
}

export const CircleSequencerView: React.FC<CircleSequencerViewProps> = ({ state }) => {
  const {
    isActive, isPlaying, lang, timeSig, activeBpm, activeVol, totalMeasures, currentMeasure,
    displayMeasure, displayTotal, expandedRef, pendingTargetMeasure, setPendingTargetMeasure,
    pendingTargetMeasureRef, pendingTargetExpandedIndex, setPendingTargetExpandedIndex,
    pendingTargetExpandedIndexRef, canvasRef, measureDisplayRef, centerOverlayRef,
    centerAfficheurRef, centerOverlayImgRef, centerOverlayTintRef, centerOverlayTextRef,
    isCenterShaking, isLetraActive, toggleLetraActive, vocalMode, setVocalMode,
    onNavigateMeasure, handleCanvasPointerDown, handleCanvasPointerMove,
  } = state;

  return (
    <div
      id="circle-sequencer-panel"
      className="flex-grow flex items-center justify-center bg-[var(--cordel-bg)] relative p-2.5 overflow-hidden w-full h-full select-none"
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      <CircleNavigationHeader
        lang={lang}
        totalMeasures={totalMeasures}
        currentMeasure={currentMeasure}
        displayMeasure={displayMeasure}
        displayTotal={displayTotal}
        expandedRef={expandedRef}
        pendingTargetMeasure={pendingTargetMeasure}
        setPendingTargetMeasure={setPendingTargetMeasure}
        pendingTargetMeasureRef={pendingTargetMeasureRef}
        pendingTargetExpandedIndex={pendingTargetExpandedIndex}
        setPendingTargetExpandedIndex={setPendingTargetExpandedIndex}
        pendingTargetExpandedIndexRef={pendingTargetExpandedIndexRef}
        measureDisplayRef={measureDisplayRef}
        onNavigateMeasure={onNavigateMeasure}
      />

      <CircleInfoBadges timeSig={timeSig} activeBpm={activeBpm} activeVol={activeVol} lang={lang} />

      <div className="flex-1 min-h-0 relative w-full h-full max-w-[800px] mx-auto flex items-center justify-center">
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
        />
      </div>

      <CircleVocalToolbar
        isLetraActive={isLetraActive}
        toggleLetraActive={toggleLetraActive}
        vocalMode={vocalMode}
        setVocalMode={setVocalMode}
        lang={lang}
      />
    </div>
  );
};
