/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ASSETS_BASE_URL } from '../../data';
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
      {/* Texture d'arrière-plan asynchrone non-bloquante pour le LCP (Art: Toni Braga) */}
      <div
        className="absolute inset-0 pointer-events-none bg-cover bg-center bg-no-repeat select-none z-0"
        style={{
          backgroundImage: `url(${ASSETS_BASE_URL}Pictures/atelier.png)`,
        }}
        aria-hidden="true"
      />

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

      {/* Bandeau de crédits Créateur & Artiste */}
      <div 
        className="absolute top-1 md:top-4 left-1/2 -translate-x-1/2 text-[8px] md:text-[12px] font-bold tracking-widest text-center z-50 pointer-events-none select-none flex flex-col md:flex-row gap-0.5 md:gap-2 leading-tight items-center"
        style={{ color: '#f4ecd8', opacity: 0.8, textShadow: '0px 2px 4px rgba(0,0,0,0.9)' }}
      >
        <span>{lang === 'pt' ? 'Criado por Julian Biblocq' : 'Créé par Julian Biblocq'}</span>
        <span className="hidden md:inline opacity-50">|</span>
        <span>{lang === 'pt' ? 'Arte: Toni Braga' : 'Art: Toni Braga'}</span>
      </div>
    </div>
  );
};
