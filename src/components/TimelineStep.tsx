import React, { useContext, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig, isDarkText, NEWTON_NOTE_COLORS, getVisualStrokeSymbol } from '../data';
import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { getBusNoteColor } from '../utils/colorHelpers';
import { useTimelineEditStore } from '../stores/useTimelineEditStore';

interface TimelineStepProps {
  trackId: number;
  patternId: number;
  measureIdx: number;
  stepIdx: number;
  stepsCount: number;
  // Index pré-calculés pour accès O(1)
  trackIdx: number;
  patternIdx: number;
  instrumentIdx: number;
  beatResolutions?: number[];
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void,
    trackId: number
  ) => void;
}

function getDisplayVal(val: string | number) {
  if (val === 0 || val === '0' || !val) return '';
  return String(val);
}

const TimelineStepComponent: React.FC<TimelineStepProps> = ({
  trackId,
  patternId,
  measureIdx,
  stepIdx,
  stepsCount,
  trackIdx,
  patternIdx,
  instrumentIdx,
  beatResolutions,
  onStepTouchStart,
}) => {
  const uiContext = useContext(TimelineUIContext);
  const sequencer = useSequencer();
  const { isPlaying } = useAudio();

  // 1. Sélecteur Zustand globalisé unique, mémoïsé et hautement performant (Zero Render Thrashing)
  const stepData = useSequencerStore(
    useShallow((state) => {
      const currentTrack = state.tracks[trackIdx];
      if (!currentTrack) return null;

      const inst = instrumentsConfig[instrumentIdx];
      const isVoice = inst?.type === 'voice';
      const isLeftHanded = state.isLeftHanded || false;

      // Détection des types de pistes
      const isLinkFolder = !!currentTrack.isLinkFolder;
      const isSlave = !!(currentTrack.linkedToTrackId && !currentTrack.isLinkFolder && !currentTrack.isLinkMaster);
      const isLinkMaster = !!(currentTrack.linkedToTrackId && !currentTrack.isLinkFolder && currentTrack.isLinkMaster);

      let masterVal: string | number = 0;
      let esclaveVal: string | number = 0;
      let resolvedVal: string | number = 0;
      let resolvedNote = '';

      // Variables unifiées pour le rendu visuel
      let isSplit = false;
      let isRightHalfOnly = false;
      let leftText = '';
      let leftFillColor = 'transparent';
      let leftTxtColor = '#f4ecd8';
      let leftIsAccent = false;
      let leftInstId = inst?.id || '';
      let leftState: string | number = '';

      let rightText = '';
      let rightFillColor = 'transparent';
      let rightTxtColor = '#f4ecd8';
      let rightInstId = '';
      let rightState: string | number = '';

      let renderCas = 0; // 0: Normal, 1: Unisson, 2: Variation, 3: Divergence, 4: Héritage Maître

      if (isLinkFolder) {
        // --- CAS PISTE DOSSIER PARENT (AFFICHE LE RÉSUMÉ COMPLET DES VARIATIONS COMME SUR LA RODA) ---
        // 1. Résolution de la valeur Master (la piste dossier elle-même)
        const masterPattern = currentTrack.patterns?.[patternIdx];
        masterVal = masterPattern?.activeSteps?.[stepIdx] ?? 0;
        resolvedVal = masterVal;
        resolvedNote = masterPattern?.notes?.[stepIdx] ?? '';
        const hasMasterEvent = masterVal !== 0 && masterVal !== '0' && masterVal !== '' && masterVal !== undefined && masterVal !== null;

        let resolvedMasterText = '';
        let resolvedMasterColor = 'transparent';
        let resolvedMasterTxtColor = '#f4ecd8';
        let resolvedMasterIsAccent = false;

        if (hasMasterEvent) {
          const visualState = getVisualStrokeSymbol(masterVal, isLeftHanded, inst.id);
          if (visualState !== 0 && visualState !== '0') {
            const stateStr = String(visualState);
            resolvedMasterColor = getBusNoteColor(String(currentTrack.id), stateStr, state.tracks, instrumentsConfig);
            resolvedMasterIsAccent = (stateStr === stateStr.toUpperCase());
            resolvedMasterText = stateStr;
            resolvedMasterTxtColor = isDarkText(inst.id, String(masterVal)) ? '#1a1a1a' : '#f4ecd8';
          } else if (String(visualState) === '0' || String(visualState) === '-') {
            resolvedMasterColor = '#ab5318'; // orange silence
            resolvedMasterText = '-';
            resolvedMasterTxtColor = '#1a1a1a';
          }
        }

        // 2. Résolution des variations enfants (satellites)
        const satellites: Array<{
          color: string;
          text: string;
          isDark: boolean;
          childInstId: string;
          childState: string | number;
        }> = [];

        const children = state.tracks.filter(t => 
          String(t.linkedToTrackId) === String(currentTrack.id) && 
          !t.isBusFolder &&
          !t.isLinkMaster
        );

        children.forEach((c) => {
          const override = c.patternOverrides?.[measureIdx];
          if (override !== undefined && override !== null) {
            const childPattern = currentTrack.patterns.find(p => p.id === override);
            if (childPattern) {
              const childState = childPattern.activeSteps?.[stepIdx] ?? 0;
              if (childState !== 0 && childState !== '') {
                const childInst = instrumentsConfig[c.instrumentIdx];
                if (childInst) {
                  const childVisualState = getVisualStrokeSymbol(childState, isLeftHanded, childInst.id);
                  if (childVisualState !== 0) {
                    const childColor = childInst.colors?.[childVisualState] || childInst.color || '#fff';
                    satellites.push({
                      color: childColor,
                      text: String(childVisualState),
                      isDark: isDarkText(childInst.id, String(childState)),
                      childInstId: childInst.id,
                      childState: childState
                    });
                  }
                }
              }
            }
          }
        });

        const hasVariationEvent = satellites.length > 0;

        // 3. Logique décisionnelle de split identique à CircleSequencer
        if (hasMasterEvent && hasVariationEvent) {
          isSplit = true;
          leftText = resolvedMasterText;
          leftFillColor = resolvedMasterColor;
          leftTxtColor = resolvedMasterTxtColor;
          leftIsAccent = resolvedMasterIsAccent;
          leftState = masterVal;
          leftInstId = inst.id;

          const rightSat = satellites[0];
          rightText = rightSat.text;
          rightFillColor = rightSat.color;
          rightTxtColor = rightSat.isDark ? '#1a1a1a' : '#f4ecd8';
          rightState = rightSat.childState;
          rightInstId = rightSat.childInstId;
        } else if (!hasMasterEvent && satellites.length >= 2) {
          isSplit = true;
          const leftSat = satellites[0];
          leftText = leftSat.text;
          leftFillColor = leftSat.color;
          leftTxtColor = leftSat.isDark ? '#1a1a1a' : '#f4ecd8';
          leftState = leftSat.childState;
          leftInstId = leftSat.childInstId;

          const rightSat = satellites[1];
          rightText = rightSat.text;
          rightFillColor = rightSat.color;
          rightTxtColor = rightSat.isDark ? '#1a1a1a' : '#f4ecd8';
          rightState = rightSat.childState;
          rightInstId = rightSat.childInstId;
        } else if (!hasMasterEvent && satellites.length === 1) {
          isRightHalfOnly = true;
          const singleSat = satellites[0];
          rightText = singleSat.text;
          rightFillColor = singleSat.color;
          rightTxtColor = singleSat.isDark ? '#1a1a1a' : '#f4ecd8';
          rightState = singleSat.childState;
          rightInstId = singleSat.childInstId;
        } else if (hasMasterEvent) {
          isSplit = false;
          leftText = resolvedMasterText;
          leftFillColor = resolvedMasterColor;
          leftTxtColor = resolvedMasterTxtColor;
          leftIsAccent = resolvedMasterIsAccent;
          leftState = masterVal;
          leftInstId = inst.id;
        }

      } else if (isSlave) {
        // --- CAS PISTE ESCLAVE INDIVIDUELLE ---
        // 1. Trouver le parent lié (bus parent)
        const parentBus = state.tracks.find(p => String(p.id) === String(currentTrack.linkedToTrackId) && p.isLinkFolder);
        const parentInst = parentBus ? instrumentsConfig[parentBus.instrumentIdx] : null;

        // 2. Trouver la piste Master correspondante
        const masterTrack = state.tracks.find(t => 
          String(t.linkedToTrackId) === String(currentTrack.linkedToTrackId) && 
          t.isLinkMaster
        );
        const masterInst = masterTrack ? instrumentsConfig[masterTrack.instrumentIdx] : null;

        if (parentBus) {
          const masterPattern = parentBus.patterns?.find(p => p.measureAssignments[measureIdx]) || parentBus.patterns?.[0];
          masterVal = masterPattern?.activeSteps?.[stepIdx] ?? 0;
        }

        // 3. Résoudre la valeur de l'esclave depuis les patterns d'override du parent
        const override = currentTrack.patternOverrides?.[measureIdx];
        if (parentBus) {
          if (override === null) {
            esclaveVal = 0;
            resolvedVal = 0;
            resolvedNote = '';
          } else if (override !== undefined) {
            const childPattern = parentBus.patterns.find(p => p.id === override);
            esclaveVal = childPattern?.activeSteps?.[stepIdx] ?? 0;
            resolvedVal = esclaveVal;
            resolvedNote = childPattern?.notes?.[stepIdx] ?? '';
          } else {
            // Suit le maître (donc pas de variation propre)
            esclaveVal = 0;
            resolvedVal = 0;
            resolvedNote = '';
          }
        }

        const hasMaitre = masterVal !== 0 && masterVal !== '';
        const hasEsclave = esclaveVal !== 0 && esclaveVal !== '';

        if (hasEsclave) {
          // Si l'esclave a sa propre note (variation active), on l'affiche PLEINE sur sa ligne
          renderCas = 2;
          leftFillColor = inst.colors?.[esclaveVal as string] || inst.color || '#111';
          leftText = String(getVisualStrokeSymbol(esclaveVal, isLeftHanded, inst.id));
          leftTxtColor = isDarkText(inst.id, String(esclaveVal)) ? '#1a1a1a' : '#f4ecd8';
          leftState = esclaveVal;
          leftInstId = inst.id;
          
          isSplit = false;
          isRightHalfOnly = false;
        } else if (hasMaitre) {
          // Héritage du Maître (l'esclave ne joue rien, affiche la note du maître en filigrane, opacité réduite)
          renderCas = 4;
          const maitreColor = (masterInst) ? (masterInst.colors?.[masterVal as string] || masterInst.color || '#111') : '#111';
          leftFillColor = maitreColor;
          if (masterInst) {
            leftText = String(getVisualStrokeSymbol(masterVal, isLeftHanded, masterInst.id));
            leftTxtColor = isDarkText(masterInst.id, String(masterVal)) ? '#1a1a1a' : '#f4ecd8';
            leftState = masterVal;
            leftInstId = masterInst.id;
          }
          
          isSplit = false;
          isRightHalfOnly = false;
        }
      } else if (isLinkMaster) {
        // --- CAS PISTE MAITRE DE LIAISON INDIVIDUELLE ---
        // 1. Trouver le parent lié (bus parent)
        const parentBus = state.tracks.find(p => String(p.id) === String(currentTrack.linkedToTrackId) && p.isLinkFolder);
        if (parentBus) {
          const masterPattern = parentBus.patterns?.find(p => p.measureAssignments[measureIdx]) || parentBus.patterns?.[0];
          const val = masterPattern?.activeSteps?.[stepIdx] ?? 0;
          resolvedVal = val;
          resolvedNote = masterPattern?.notes?.[stepIdx] ?? '';
          const hasEvent = val !== 0 && val !== '';

          if (hasEvent) {
            const visualVal = getVisualStrokeSymbol(val, isLeftHanded, inst.id);
            leftState = val;
            leftInstId = inst.id;

            if (isVoice) {
              leftText = '';
              leftFillColor = inst.color || '#111';
            } else {
              leftText = String(visualVal);
              leftFillColor = inst.colors?.[visualVal as string] || inst.color || '#111';
              leftTxtColor = isDarkText(inst.id, String(val)) ? '#1a1a1a' : '#f4ecd8';
            }
          }
        }
      } else {
        // --- CAS PISTE STANDARD ---
        const pattern = currentTrack.patterns?.[patternIdx];
        const val = pattern?.activeSteps?.[stepIdx] ?? 0;
        resolvedVal = val;
        resolvedNote = pattern?.notes?.[stepIdx] ?? '';
        const hasEvent = val !== 0 && val !== '';

        if (hasEvent) {
          const visualVal = getVisualStrokeSymbol(val, isLeftHanded, inst.id);
          leftState = val;
          leftInstId = inst.id;

          if (isVoice) {
            leftText = ''; // Géré par noteLetter en dehors du flux texte standard
            leftFillColor = inst.color || '#111';
          } else {
            leftText = String(visualVal);
            leftFillColor = inst.colors?.[visualVal as string] || inst.color || '#111';
            leftTxtColor = isDarkText(inst.id, String(val)) ? '#1a1a1a' : '#f4ecd8';
          }
        }
      }

      // Informations complémentaires requises pour le chant ou la signature rythmique
      const note = isVoice ? resolvedNote : '';
      const timeSigStr = state.measureTimeSigs[measureIdx] || '4/4';

      return {
        isLinkFolder,
        isSlave,
        masterVal,
        esclaveVal,
        val: resolvedVal,
        isSplit,
        isRightHalfOnly,
        leftText,
        leftFillColor,
        leftTxtColor,
        leftIsAccent,
        rightText,
        rightFillColor,
        rightTxtColor,
        renderCas,
        isVoice,
        note,
        timeSigStr,
      };
    })
  );

  if (!uiContext || !stepData) return null;
  const { MEASURE_W } = uiContext;

  // Calcul de la largeur de l'étape
  const defaultBeats = parseInt(stepData.timeSigStr.split('/')[0], 10) || 4;
  const beatRes = beatResolutions || Array(defaultBeats).fill(Math.floor(stepsCount / defaultBeats) || 4);

  let stepWidth = MEASURE_W / stepsCount;
  let accumulated = 0;

  for (let b = 0; b < beatRes.length; b++) {
    if (stepIdx >= accumulated && stepIdx < accumulated + beatRes[b]) {
      stepWidth = (MEASURE_W / defaultBeats) / beatRes[b];
      break;
    }
    accumulated += beatRes[b];
  }

  const style: React.CSSProperties = {
    width: `${stepWidth}px`,
  };

  // Résolution géométrique du fond de la cellule
  let stepBg = '#111';
  let hasBackground = false;

  if (stepData.isRightHalfOnly) {
    // 135deg avec transparent en haut-gauche et variation en bas-droite
    stepBg = `linear-gradient(135deg, transparent 50%, ${stepData.rightFillColor} 50%)`;
    hasBackground = true;
  } else if (stepData.isSplit) {
    // 135deg avec Maître en haut-gauche et Variation en bas-droite
    stepBg = `linear-gradient(135deg, ${stepData.leftFillColor} 50%, ${stepData.rightFillColor} 50%)`;
    hasBackground = true;
  } else if (stepData.leftFillColor !== 'transparent') {
    stepBg = stepData.leftFillColor;
    hasBackground = true;
  }

  // Résolution de l'opacité
  let bgOpacity = 1.0;
  if (stepData.renderCas === 4) {
    bgOpacity = 0.4;
  } else if (!hasBackground) {
    bgOpacity = 0;
  }

  // Résolution de la note vocale (chant)
  const noteLetter = stepData.note ? stepData.note.charAt(0).toUpperCase() : '';
  const noteColor = noteLetter ? (NEWTON_NOTE_COLORS[noteLetter] || '#1a1a1a') : '#1a1a1a';

  const inst = instrumentsConfig[instrumentIdx];

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isPlaying) return;

    let targetTrackId = trackId;
    let targetPatternId = patternId;

    const state = useSequencerStore.getState();
    const currentTrack = state.tracks[trackIdx];
    const isLinkedChild = !!(currentTrack && currentTrack.linkedToTrackId && !currentTrack.isLinkFolder);

    if (isLinkedChild) {
      const parentBus = state.tracks.find(p => String(p.id) === String(currentTrack.linkedToTrackId) && p.isLinkFolder);
      if (parentBus) {
        targetTrackId = parentBus.id;
        if (currentTrack.isLinkMaster) {
          const masterPattern = parentBus.patterns?.find(p => p.measureAssignments[measureIdx]) || parentBus.patterns?.[0];
          if (masterPattern) {
            targetPatternId = masterPattern.id;
          }
        } else {
          const override = currentTrack.patternOverrides?.[measureIdx];
          if (override !== undefined && override !== null) {
            targetPatternId = override;
          } else {
            const masterPattern = parentBus.patterns?.find(p => p.measureAssignments[measureIdx]) || parentBus.patterns?.[0];
            if (masterPattern) {
              targetPatternId = masterPattern.id;
            }
          }
        }
      }
    }

    if (onStepTouchStart) {
      onStepTouchStart(
        e,
        targetPatternId,
        stepIdx,
        inst.id,
        stepData.val,
        (newVal) => {
          sequencer.handleTrackStepValueChange(targetTrackId, targetPatternId, stepIdx, newVal);
        },
        targetTrackId
      );
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const allowedStrokes = Object.keys(inst.colors || {}).filter(k => k !== 'text');

      useTimelineEditStore.getState().openEditor({
        activeStepKey: `${targetTrackId}_${measureIdx}_${stepIdx}`,
        anchorRect: rect,
        allowedStrokes,
        currentVal: stepData.val,
        trackId: targetTrackId,
        patternId: targetPatternId,
        measureIdx,
        stepIdx
      });
    }
  };

  const handleMouseEnter = () => {
    const allowedStrokes = Object.keys(inst.colors || {}).filter(k => k !== 'text');
    (window as any).activeHoveredStep = {
      trackId,
      patternId,
      measureIdx,
      stepIdx,
      allowedStrokes,
      currentVal: stepData.val
    };
  };

  const handleMouseLeave = () => {
    if ((window as any).activeHoveredStep?.trackId === trackId &&
        (window as any).activeHoveredStep?.measureIdx === measureIdx &&
        (window as any).activeHoveredStep?.stepIdx === stepIdx) {
      (window as any).activeHoveredStep = null;
    }
  };

  return (
    <div
      className="timeline-step relative h-full border-r border-[var(--cordel-border)]/10 flex flex-col items-center justify-center text-center cursor-pointer select-none overflow-hidden"
      style={style}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-measure={measureIdx}
      data-step={stepIdx}
      data-steps={stepsCount}
      data-track-id={trackId}
      data-pattern-id={patternId}
      data-val={stepData.val}
    >
      {/* Background layer (GPU accelerated) */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-75 ease-out"
        style={{
          background: (stepData.isSplit || stepData.isRightHalfOnly) ? stepBg : undefined,
          backgroundColor: (stepData.isSplit || stepData.isRightHalfOnly) ? undefined : stepBg,
          opacity: bgOpacity,
          willChange: 'opacity',
          zIndex: 1
        }}
      />

      {/* Accent ring decoration */}
      {stepData.leftIsAccent && (
        <div className="absolute inset-1 border border-white/80 rounded z-10 pointer-events-none" />
      )}

      {/* Content layer */}
      <div 
        className="relative z-10 w-full h-full flex flex-col items-center justify-center animate-fade-in"
        style={{ opacity: stepData.renderCas === 4 ? 0.6 : 1 }}
      >
        {stepData.isSplit || stepData.isRightHalfOnly ? (
          <div className="relative w-full h-full">
            {/* Cas 3: Raccourci du maître/variation1 en haut à gauche */}
            {stepData.isSplit && stepData.leftText && (
              <span 
                className="absolute top-0.5 left-1 text-[9px] font-black leading-none"
                style={{ color: stepData.leftTxtColor }}
              >
                {stepData.leftText}
              </span>
            )}
            {/* Cas 2 & 3: Raccourci de la variation/esclave en bas à droite */}
            {stepData.rightText && (
              <span 
                className="absolute bottom-0.5 right-1 text-[9px] font-black leading-none"
                style={{ color: stepData.rightTxtColor }}
              >
                {stepData.rightText}
              </span>
            )}
          </div>
        ) : stepData.isVoice ? (
          <span 
            className="text-[13px] font-extrabold tracking-wide" 
            style={{ color: noteColor, textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)' }}
          >
            {noteLetter || ''}
          </span>
        ) : (
          <span 
            className="text-[13px] font-extrabold tracking-wide"
            style={{ color: stepData.leftTxtColor }}
          >
            {getDisplayVal(stepData.leftText)}
          </span>
        )}
      </div>
    </div>
  );
};

export const TimelineStep = React.memo(TimelineStepComponent, (prevProps, nextProps) => {
  return (
    prevProps.trackId === nextProps.trackId &&
    prevProps.patternId === nextProps.patternId &&
    prevProps.measureIdx === nextProps.measureIdx &&
    prevProps.stepIdx === nextProps.stepIdx &&
    prevProps.stepsCount === nextProps.stepsCount &&
    prevProps.trackIdx === nextProps.trackIdx &&
    prevProps.patternIdx === nextProps.patternIdx &&
    prevProps.instrumentIdx === nextProps.instrumentIdx
  );
});

