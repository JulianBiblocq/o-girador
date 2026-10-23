
import React from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { PercussionStepCellProps } from './percussionCellTypes';
import { arePercussionPropsEqual } from './percussionStepCellComparator';
import { PercussionStepSplitVisual } from './PercussionStepSplitVisual';
import { PercussionStepSingleInput } from './PercussionStepSingleInput';
import { PercussionStepSculptBars } from './PercussionStepSculptBars';
import { SCISSORS_CURSOR, GLUE_CURSOR } from './gridConstants';

export const PercussionStepCell = React.memo((props: PercussionStepCellProps) => {
  const {
    i, val, volume, decay, isSelected, isMultiSelected, isFocused,
    selectedSubIndex, activeTool, shiftPx, colorStyle, splitLeftColor,
    splitRightColor, splitLeftText, splitRightText, isMultiSelectActive,
    isSextuplet, isTriplet, isOcto, indexInGroup, totalShift,
    trackId, patternId, onMouseDown, onMouseEnter, onTouchStart,
    onTouchMove, onTouchEnd, onContextMenu, onChange, onKeyDown, onSelectForSculpt
  } = props;
  const lang = useSequencerStore(state => state.lang);

  return (
    <div
      key={i}
      className="step-cell percussion-step-container flex flex-col items-center select-none relative w-full min-w-0 flex-1"
      data-track-id={trackId}
      data-pattern-id={patternId}
      data-step-index={i}
      style={{
        width: '100%',
        cursor: activeTool === 'scissors' ? (Array.isArray(val) ? GLUE_CURSOR : SCISSORS_CURSOR) : undefined
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e, i, val);
      }}
      onMouseDown={activeTool === 'scissors' ? (e) => onMouseDown(e, i, val) : undefined}
      onTouchStart={activeTool === 'scissors' ? (e) => onTouchStart(e, i, val) : undefined}
      onTouchEnd={activeTool === 'scissors' ? (e) => onTouchEnd?.(e, i, val) : undefined}
      onClick={() => onSelectForSculpt?.(i)}
      title={activeTool === 'scissors' ? (Array.isArray(val) ? (lang === 'fr' ? '/ Recoller le pas (Fusionner)' : '/ Juntar o passo (Mesclar)') : (lang === 'fr' ? '/ Scinder le pas en doubles croches' : '/ Dividir o passo em semicolcheias')) : undefined}
    >
      {Array.isArray(val) ? (
        <PercussionStepSplitVisual
          i={i} val={val} trackId={trackId} patternId={patternId}
          isFocused={isFocused} isMultiSelected={isMultiSelected}
          selectedSubIndex={selectedSubIndex} activeTool={activeTool}
          shiftPx={shiftPx} splitLeftColor={splitLeftColor}
          splitRightColor={splitRightColor} splitLeftText={splitLeftText}
          splitRightText={splitRightText} isSextuplet={isSextuplet}
          isTriplet={isTriplet} isOcto={isOcto} indexInGroup={indexInGroup}
          onMouseDown={onMouseDown} onMouseEnter={onMouseEnter}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd} onContextMenu={onContextMenu}
          onKeyDown={onKeyDown} onSelectForSculpt={onSelectForSculpt}
        />
      ) : (
        <PercussionStepSingleInput
          i={i} val={val} trackId={trackId} patternId={patternId}
          shiftPx={shiftPx} colorStyle={colorStyle} activeTool={activeTool}
          isFocused={isFocused} isMultiSelected={isMultiSelected}
          isMultiSelectActive={isMultiSelectActive} isSextuplet={isSextuplet}
          isTriplet={isTriplet} isOcto={isOcto} indexInGroup={indexInGroup}
          onMouseDown={onMouseDown} onMouseEnter={onMouseEnter}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd} onContextMenu={onContextMenu}
          onChange={onChange} onKeyDown={onKeyDown}
          onSelectForSculpt={onSelectForSculpt}
        />
      )}
      <PercussionStepSculptBars
        i={i} val={val} volume={volume} decay={decay}
        totalShift={totalShift} isFocused={isFocused}
        selectedSubIndex={selectedSubIndex} onSelectForSculpt={onSelectForSculpt}
      />
    </div>
  );
}, arePercussionPropsEqual);
