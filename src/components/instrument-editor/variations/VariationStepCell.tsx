
import React from 'react';
import { isDarkText } from '../../../data';
import { VariationStepSculptBars } from './VariationStepSculptBars';
import { handleVariationStepKeyDown } from './useVariationStepKeyHandler';
import { useVariationStepPointerHandlers } from './useVariationStepPointerHandlers';

export interface VariationStepCellProps {
  i: number;
  val: string | number | [string, string];
  variation: any;
  ptn: any;
  inst: any;
  lang: any;
  isLeftHanded: boolean;
  trackId: number;
  isSelected: boolean;
  selectedStepIdx: number | null;
  selectedVariationId: string | null;
  selectedSubIndex?: 0 | 1 | null;
  isTouchDevice: boolean;
  isMultiSelectActive: boolean;
  selectedStepIndices: number[];
  getStepSwingPercent: (stepIdx: number, steps: number, beatResolutions?: number[]) => number;
  onSelectPattern: (id: number) => void;
  setSelectedPatternId: (id: number) => void;
  setSelectedVariationId: (id: string | null) => void;
  setSelectedStepIdx: (idx: number | null) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setSelectedSubIndex?: (subIndex: 0 | 1 | null) => void;
  setIsMultiSelectActive: (val: boolean) => void;
  onVariationStepValueChange?: (ptnId: number, varId: string, idx: any, val: any) => void;
  onStepTouchStart?: any;
  handleTogglePlay: () => void;
  applyStrokeToVariationStep: (varId: string, idx: number, val: any, isInitial?: boolean) => void;
  isMouseDownRef: React.MutableRefObject<boolean>;
}

export const VariationStepCell: React.FC<VariationStepCellProps> = React.memo((props) => {
  const {
    i, val, variation, ptn, inst, lang, isLeftHanded, trackId,
    isSelected, selectedStepIdx, selectedVariationId, selectedSubIndex,
    isTouchDevice, selectedStepIndices, getStepSwingPercent,
    onSelectPattern, setSelectedPatternId, setSelectedVariationId, setSelectedStepIdx,
    setSelectedStepIndices, setSelectedSubIndex, onVariationStepValueChange,
    handleTogglePlay,
  } = props;

  const displayVal = val === 0 || val === '0' || !val ? '' : (Array.isArray(val) ? `${val[0]}/${val[1]}` : String(val));
  const isActive = val !== 0 && val !== '0' && val !== '';
  let colorStyle: React.CSSProperties = {};
  if (isActive) {
    const bgColor = inst.colors[val as string] || '#111';
    const txtColor = isDarkText(inst.id, val as string) ? '#1a1a1a' : (inst.colors.text || '#f4ecd8');
    colorStyle = { backgroundColor: bgColor, color: txtColor };
  }

  const isCurrentSelected = selectedStepIdx === i && selectedVariationId === variation.id;
  const pointer = useVariationStepPointerHandlers(props);

  return (
    <div data-step-index={i} data-variation-id={variation.id} className="relative flex flex-col items-center" style={{ width: '36px' }}>
      <div className="text-[8px] text-[#999] font-bold mb-0.5 z-10 relative">{i + 1}</div>
      <input
        data-step-index={i} data-variation-id={variation.id} type="text"
        maxLength={['caixa', 'tarol', 'timbal'].includes(inst.id) ? 3 : 1}
        value={displayVal} readOnly={false} inputMode={isTouchDevice ? 'none' : undefined}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => {
          if (!isTouchDevice) e.target.select();
          onSelectPattern(ptn.id);
          setSelectedPatternId(ptn.id);
        }}
        onMouseDown={pointer.handleMouseDown}
        onMouseEnter={pointer.handleMouseEnter}
        onTouchStart={pointer.handleTouchStart}
        onChange={(e) => onVariationStepValueChange?.(ptn.id, variation.id, i, e.target.value)}
        onKeyDown={(e) => handleVariationStepKeyDown({
          e, stepIdx: i, val, ptnId: ptn.id, variationId: variation.id,
          volumes: variation.volumes, decays: variation.decays, inst, lang,
          isLeftHanded, trackId, onVariationStepValueChange, setSelectedStepIdx,
          setSelectedStepIndices, handleTogglePlay,
        })}
        className={`step-input-cell text-center text-sm font-bold outline-none p-0 box-border z-10 relative transition-all duration-200 cursor-pointer ${
          isCurrentSelected
            ? '!border-2 !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20 m-[1px] rounded-none'
            : (!val || val === 0 || val === '0')
              ? 'bg-[#ece4d0] text-[#1a1a1a] border border-[#1a1a1a]/30 shadow-[1px_1px_0px_rgba(26,26,26,0.3)] rounded-none m-[1px]'
              : 'border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] rounded-none m-[1px]'
        }`}
        style={{ width: '34px', height: '34px', ...colorStyle }}
      />
      <div
        className={`w-full mt-1.5 z-10 relative select-none min-h-[18px] py-0.5 cursor-pointer rounded-xs transition-colors p-[1px] ${
          isSelected && selectedVariationId === variation.id ? 'bg-[#8b2a1a]/15 ring-1 ring-[#8b2a1a]' : 'hover:bg-[#1a1a1a]/10'
        }`}
        style={{ touchAction: 'manipulation' }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectPattern(ptn.id);
          setSelectedPatternId(ptn.id);
          setSelectedVariationId(variation.id);
          setSelectedStepIdx(i);
          setSelectedStepIndices([i]);
          setSelectedSubIndex?.(null);
        }}
        title={lang === 'fr' ? 'Régler le volume, decay et micro-timing (Escultor)' : 'Ajustar volume, decay e micro-timing (Escultor)'}
      >
        <VariationStepSculptBars
          val={val} stepIdx={i} variation={variation} isSelected={isSelected}
          selectedSubIndex={selectedSubIndex} getStepSwingPercent={getStepSwingPercent}
          beatResolutions={ptn.beatResolutions} onSelectSubIndex={(sub) => setSelectedSubIndex?.(sub)}
        />
      </div>
    </div>
  );
});

VariationStepCell.displayName = 'VariationStepCell';
