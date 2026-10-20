/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VariationCardHeader } from './VariationCardHeader';
import { VariationGridPreview, VariationGridPreviewProps } from './VariationGridPreview';
import { Language } from '../../../types';

export interface VariationCardProps extends VariationGridPreviewProps {
  lang: Language;
  soloPatternPlayId: number | null;
  soloPatternVariationId: string | null;
  onPlaySoloPattern?: (patternId: number, variationId?: string) => void;
  onStopSoloPattern?: () => void;
  onTogglePatternVariationFirstTimeOnly?: (patternId: number, variationId: string, val: boolean) => void;
  onUpdatePatternVariationProbability?: (patternId: number, variationId: string, probability: number) => void;
  onDeletePatternVariation?: (patternId: number, variationId: string) => void;
}

export const VariationCard: React.FC<VariationCardProps> = React.memo((props) => {
  const {
    variation, ptn, lang, soloPatternPlayId, soloPatternVariationId,
    onPlaySoloPattern, onStopSoloPattern, onTogglePatternVariationFirstTimeOnly,
    onUpdatePatternVariationProbability, onDeletePatternVariation,
  } = props;

  return (
    <div key={variation.id} className="flex flex-col gap-1.5 p-2 bg-[#ece4d0]/60 cordel-border-sm border-dashed">
      <VariationCardHeader
        variation={variation} ptnId={ptn.id} lang={lang}
        soloPatternPlayId={soloPatternPlayId} soloPatternVariationId={soloPatternVariationId}
        onPlaySoloPattern={onPlaySoloPattern} onStopSoloPattern={onStopSoloPattern}
        onTogglePatternVariationFirstTimeOnly={onTogglePatternVariationFirstTimeOnly}
        onUpdatePatternVariationProbability={onUpdatePatternVariationProbability}
        onDeletePatternVariation={onDeletePatternVariation}
      />
      <VariationGridPreview {...props} />
    </div>
  );
});

VariationCard.displayName = 'VariationCard';
