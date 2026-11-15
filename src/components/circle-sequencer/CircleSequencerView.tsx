import React from 'react';
import { ASSETS_BASE_URL } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { CircleInfoBadges } from './CircleInfoBadges';
import { CircleCenterOverlay } from './CircleCenterOverlay';
import { CircleVocalToolbar } from './CircleVocalToolbar';
import { AoVivoOverlay } from '../AoVivoOverlay';
import { BluetoothListeningBadge } from '../bluetooth/BluetoothListeningBadge';
import { StrokeInfoPopover } from '../pedagogy/StrokeInfoPopover';

interface CircleSequencerViewProps {
  state: any;
}

export const CircleSequencerView: React.FC<CircleSequencerViewProps> = ({ state }) => {
  const {
    isActive, lang, timeSig, activeBpm, activeVol,
    canvasRef, centerOverlayRef,
    centerAfficheurRef, centerOverlayImgRef, centerOverlayTintRef, centerOverlayTextRef,
    isCenterShaking, isLetraActive, toggleLetraActive, vocalMode, setVocalMode,
    handleCanvasPointerDown, pedagogyTarget, setPedagogyTarget, isMobile,
  } = state;
  const mobileViewMode = useSequencerStore((s) => s.mobileViewMode);

  return (
    <div
      id="circle-sequencer-panel"
      onContextMenu={(e) => e.preventDefault()}
      className="flex-grow flex items-center justify-center bg-[var(--cordel-bg)] relative p-2.5 overflow-hidden w-full h-full select-none"
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      <div
        className="absolute inset-0 pointer-events-none bg-cover bg-center bg-no-repeat select-none z-0 invert mix-blend-multiply opacity-20 dark:invert-0 dark:opacity-25 dark:mix-blend-normal"
        style={{ backgroundImage: `url(${ASSETS_BASE_URL}Pictures/atelier.png)` }}
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

      <div
        className="relative flex-1 w-full h-full min-w-0 min-h-0 max-w-[800px] flex items-center justify-center overflow-hidden py-2"
        style={{ containerType: 'size' }}
      >
        <div
          className="relative aspect-square shrink-0 flex items-center justify-center"
          style={{
            width: 'min(100cqw, 100cqh)',
            height: 'min(100cqw, 100cqh)',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          <canvas
            ref={canvasRef}
            width={1200}
            height={1200}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={handleCanvasPointerDown}
            className="w-full h-full block aspect-square cursor-pointer select-none"
            style={{ touchAction: 'none' }}
            role="application"
            aria-label={lang === 'pt' ? 'Roda de maracatu — sequenciador circular' : 'Roda de maracatu — séquenceur circulaire'}
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

      <BluetoothListeningBadge lang={lang} />
      <AoVivoOverlay />
      <StrokeInfoPopover target={pedagogyTarget} onClose={() => setPedagogyTarget(null)} />
    </div>
  );
};
