
import React from 'react';
import { SortablePatternWrapper } from './SortablePatternWrapper';
import { PatternCardHeader } from './PatternCardHeader';
import { InstrumentPatternGrid } from '../../InstrumentPatternGrid';
import { PatternVariationsEditor } from '../PatternVariationsEditor';
import { InstrumentEffects } from '../../InstrumentEffects';
import { SortablePatternCardProps } from './patternCardTypes';

export const SortablePatternCard: React.FC<SortablePatternCardProps> = React.memo((props) => {
  const {
    ptn, ptnIdx, isSelected, isVocalContext, track, inst, effectiveEditTrackId,
    totalPatternsCount, selectedPatternId, setSelectedPatternId, selectedStepIdx,
    setSelectedStepIdx, selectedStepIndices, setSelectedStepIndices, selectedVariationId,
    setSelectedVariationId, selectedSubIndex, setSelectedSubIndex, isTupletEditMode,
    isMultiSelectActive, setIsMultiSelectActive, selectedStepIsPreRoll, setSelectedStepIsPreRoll,
    onStepTouchStart, onCopyPattern, onPastePattern, canPaste, activeTool, isAlternating,
    isLeftHanded, isTouchDevice, lang, isMobile, armedPatternId, toggleArmPattern,
    editingPatternId, editName, setEditingPatternId, setEditName, handleSaveName,
    onSelectPattern, onDeletePattern, onStepsChange, soloPatternPlayId, soloPatternVariationId,
    onPlaySoloPattern, onStopSoloPattern, onTogglePatternVariationFirstTimeOnly,
    onUpdatePatternVariationProbability, onDeletePatternVariation, onVariationStepValueChange,
    onAddPatternVariation, getStepSwingPercent, usage, patternDOMRefs, badgeDOMRefs, onOpenContextMenu,
  } = props;

  return (
    <SortablePatternWrapper key={ptn.id} id={ptn.id}>
      {({ setNodeRef, style, attributes, listeners }: any) => (
        <div
          ref={(el) => {
            setNodeRef(el);
            if (el) patternDOMRefs.current.set(ptn.id, el);
            else patternDOMRefs.current.delete(ptn.id);
          }}
          data-pattern-card={ptn.id}
          data-pattern-id={ptn.id}
          data-selected={isSelected}
          onClick={() => {
            onSelectPattern?.(ptn.id);
            setSelectedPatternId?.(ptn.id);
            setSelectedVariationId?.(null);
          }}
          className={`p-4 flex flex-col gap-3 transition-all duration-150 cursor-pointer rounded-xs ${
            isSelected
              ? 'border-2 border-[#8b2a1a] shadow-[3px_3px_0px_#8b2a1a] bg-[#f9f5ea]'
              : 'border border-[#1a1a1a]/30 shadow-[1px_1px_0px_rgba(26,26,26,0.15)] bg-[#f0e6d2]/80 hover:bg-[#f0e6d2]'
          } ${armedPatternId === ptn.id ? 'cordel-arm-pulse' : ''}`}
          style={style}
        >
          <PatternCardHeader
            ptn={ptn} ptnIdx={ptnIdx} isSelected={isSelected} isVocalContext={isVocalContext}
            totalPatternsCount={totalPatternsCount} editingPatternId={editingPatternId}
            editName={editName} setEditingPatternId={setEditingPatternId} setEditName={setEditName}
            handleSaveName={handleSaveName} onSelectPattern={onSelectPattern} onDeletePattern={onDeletePattern}
            onStepsChange={onStepsChange} armedPatternId={armedPatternId} toggleArmPattern={toggleArmPattern}
            trackId={track.id} soloPatternPlayId={soloPatternPlayId} soloPatternVariationId={soloPatternVariationId}
            onPlaySoloPattern={onPlaySoloPattern} onStopSoloPattern={onStopSoloPattern} usage={usage}
            lang={lang} isMobile={isMobile} attributes={attributes} listeners={listeners}
            badgeRef={(el) => { if (el) badgeDOMRefs.current.set(ptn.id, el); else badgeDOMRefs.current.delete(ptn.id); }}
            onOpenContextMenu={onOpenContextMenu}
          />

          <InstrumentPatternGrid
            trackId={effectiveEditTrackId} pattern={ptn} instrument={inst}
            selectedPatternId={selectedPatternId} selectedStepIdx={selectedStepIdx}
            selectedStepIndices={selectedStepIndices} selectedVariationId={selectedVariationId}
            selectedSubIndex={selectedSubIndex} setSelectedSubIndex={setSelectedSubIndex}
            isTupletEditMode={isTupletEditMode} isMultiSelectActive={isMultiSelectActive}
            selectedStepIsPreRoll={selectedStepIsPreRoll} setSelectedStepIsPreRoll={setSelectedStepIsPreRoll}
            setSelectedPatternId={setSelectedPatternId} setSelectedStepIdx={setSelectedStepIdx}
            setSelectedVariationId={setSelectedVariationId} setSelectedStepIndices={setSelectedStepIndices}
            setIsMultiSelectActive={setIsMultiSelectActive} onStepTouchStart={onStepTouchStart}
            onCopyPattern={onCopyPattern} onPastePattern={onPastePattern} canPaste={canPaste}
            activeTool={activeTool} isAlternating={isAlternating}
          />

          <PatternVariationsEditor
            trackId={effectiveEditTrackId} lang={lang} ptn={ptn} inst={inst}
            activeTool={activeTool} isAlternating={isAlternating} isLeftHanded={isLeftHanded}
            selectedPatternId={selectedPatternId} onSelectPattern={onSelectPattern}
            soloPatternPlayId={soloPatternPlayId} soloPatternVariationId={soloPatternVariationId}
            isTouchDevice={isTouchDevice} isMultiSelectActive={isMultiSelectActive}
            selectedStepIdx={selectedStepIdx} selectedVariationId={selectedVariationId}
            selectedStepIndices={selectedStepIndices} selectedSubIndex={selectedSubIndex}
            setSelectedSubIndex={setSelectedSubIndex} onStopSoloPattern={onStopSoloPattern}
            onPlaySoloPattern={onPlaySoloPattern} onAddPatternVariation={onAddPatternVariation}
            onTogglePatternVariationFirstTimeOnly={onTogglePatternVariationFirstTimeOnly}
            onUpdatePatternVariationProbability={onUpdatePatternVariationProbability}
            onDeletePatternVariation={onDeletePatternVariation}
            onVariationStepValueChange={onVariationStepValueChange}
            onStepTouchStart={onStepTouchStart} setSelectedPatternId={setSelectedPatternId}
            setSelectedStepIdx={setSelectedStepIdx} setSelectedVariationId={setSelectedVariationId}
            setSelectedStepIndices={setSelectedStepIndices} setIsMultiSelectActive={setIsMultiSelectActive}
            getStepSwingPercent={getStepSwingPercent}
          />

          {selectedPatternId === ptn.id && selectedStepIdx !== null && (
            <InstrumentEffects
              trackId={effectiveEditTrackId} pattern={ptn}
              selectedStepIdx={selectedStepIdx} selectedStepIndices={selectedStepIndices}
              selectedVariationId={selectedVariationId} selectedSubIndex={selectedSubIndex}
              onSelectSubIndex={setSelectedSubIndex}
              onClose={() => {
                setSelectedStepIdx(null);
                setSelectedStepIndices([]);
                setSelectedSubIndex(null);
              }}
            />
          )}
        </div>
      )}
    </SortablePatternWrapper>
  );
});

SortablePatternCard.displayName = 'SortablePatternCard';
