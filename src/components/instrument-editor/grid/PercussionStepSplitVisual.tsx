/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GLUE_CURSOR } from './gridConstants';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { SplitHalfZone } from './SplitHalfZone';

interface PercussionStepSplitVisualProps {
  i: number;
  val: [string, string];
  trackId: number;
  patternId: number;
  isFocused: boolean;
  isMultiSelected: boolean;
  selectedSubIndex?: 0 | 1 | null;
  activeTool?: string | number;
  shiftPx: number;
  splitLeftColor?: string;
  splitRightColor?: string;
  splitLeftText?: string;
  splitRightText?: string;
  isSextuplet: boolean;
  isTriplet: boolean;
  isOcto: boolean;
  indexInGroup: number;
  onMouseDown: (e: React.MouseEvent<any>, index: number, value: any, subIndex: 0 | 1) => void;
  onMouseEnter: (index: number, e?: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent<any>, index: number, value: any, subIndex: 0 | 1) => void;
  onTouchMove?: (e: React.TouchEvent<any>) => void;
  onTouchEnd?: (e: React.TouchEvent<any>, index: number, value: any, subIndex: 0 | 1) => void;
  onContextMenu?: (e: React.MouseEvent<any>, index: number, value: any, subIndex?: 0 | 1) => void;
  onKeyDown: (e: React.KeyboardEvent<any>, index: number, value: any, subIndex: 0 | 1) => void;
  onSelectForSculpt?: (index: number, subIndex?: 0 | 1) => void;
}

export const PercussionStepSplitVisual: React.FC<PercussionStepSplitVisualProps> = (props) => {
  const {
    i, val, trackId, patternId, isFocused, isMultiSelected, selectedSubIndex,
    activeTool, shiftPx, splitLeftColor, splitRightColor, splitLeftText, splitRightText,
    isSextuplet, isTriplet, isOcto, indexInGroup, onContextMenu
  } = props;
  const lang = useSequencerStore(state => state.lang);

  const borderClass = isMultiSelected
    ? '!border-[2px] !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20 m-[1px] rounded-none'
    : (isFocused && (selectedSubIndex === null || selectedSubIndex === undefined))
      ? '!border-2 !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20 m-[1px] rounded-none'
      : 'border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] rounded-none m-[1px]';

  return (
    <div
      className={`step-input-cell relative flex items-center justify-center font-bold outline-none p-0 box-border z-10 transition-all duration-200 overflow-hidden ${
        isOcto ? 'text-[9px]' : 'text-sm'
      } ${borderClass}`}
      style={{
        width: 'calc(100% - 2px)',
        maxWidth: isSextuplet || isTriplet || isOcto ? undefined : '44px',
        height: isSextuplet || isTriplet ? '48px' : '38px',
        transform: `translateX(${shiftPx}px)`,
        background: `linear-gradient(135deg, ${splitLeftColor || '#666'} 48%, #1a1a1a 48%, #1a1a1a 52%, ${splitRightColor || '#666'} 52%)`,
        clipPath: isSextuplet 
          ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
          : isTriplet ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
        borderStyle: isSextuplet || isTriplet ? 'none' : undefined,
        borderRadius: isSextuplet || isTriplet ? '0' : undefined,
        cursor: activeTool === 'scissors' ? GLUE_CURSOR : 'pointer'
      }}
      data-track-id={trackId}
      data-pattern-id={patternId}
      data-step-index={i}
      onContextMenu={(e) => {
        e.preventDefault();
        const targetEl = e.target as HTMLElement;
        if (!targetEl.hasAttribute('data-sub-index') && !targetEl.closest('[data-sub-index]')) {
          onContextMenu?.(e, i, val);
        }
      }}
      title={activeTool === 'scissors' ? (lang === 'fr' ? '/ Recoller le pas (Fusionner)' : '/ Juntar o passo (Mesclar)') : undefined}
    >
      <SplitHalfZone
        trackId={trackId} patternId={patternId} i={i} subIndex={0}
        textVal={val[0]} textColor={splitLeftText} activeTool={activeTool}
        onMouseDown={props.onMouseDown} onMouseEnter={props.onMouseEnter}
        onTouchStart={props.onTouchStart} onTouchMove={props.onTouchMove}
        onTouchEnd={props.onTouchEnd} onContextMenu={props.onContextMenu}
        onKeyDown={props.onKeyDown} onSelectForSculpt={props.onSelectForSculpt}
      />
      <SplitHalfZone
        trackId={trackId} patternId={patternId} i={i} subIndex={1}
        textVal={val[1]} textColor={splitRightText} activeTool={activeTool}
        onMouseDown={props.onMouseDown} onMouseEnter={props.onMouseEnter}
        onTouchStart={props.onTouchStart} onTouchMove={props.onTouchMove}
        onTouchEnd={props.onTouchEnd} onContextMenu={props.onContextMenu}
        onKeyDown={props.onKeyDown} onSelectForSculpt={props.onSelectForSculpt}
      />
      {isFocused && selectedSubIndex === 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points="0,0 100,0 0,100" fill="rgba(244, 236, 216, 0.2)" stroke="#8b2a1a" strokeWidth="6" strokeLinejoin="miter" />
        </svg>
      )}
      {isFocused && selectedSubIndex === 1 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points="100,0 100,100 0,100" fill="rgba(244, 236, 216, 0.2)" stroke="#8b2a1a" strokeWidth="6" strokeLinejoin="miter" />
        </svg>
      )}
    </div>
  );
};
