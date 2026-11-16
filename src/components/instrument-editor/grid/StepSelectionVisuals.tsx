import React from 'react';

export const STEP_SELECTION_BOX_SHADOW =
  'inset 0 0 0 2px var(--cordel-bg), 0 0 0 2px var(--cordel-accent), 0 3px 0 1px var(--cordel-border)';

export const STEP_PASSIVE_CURSOR_SHADOW =
  'inset 0 0 0 1.5px var(--cordel-bg), 0 0 0 1.5px var(--cordel-wood)';

export const STEP_EMPTY_SELECTED_BG =
  'color-mix(in srgb, var(--cordel-accent) 16%, var(--cordel-bg))';

export const STEP_TUPLET_SELECTION_FILTER =
  'drop-shadow(0 0 1.5px var(--cordel-accent)) drop-shadow(0 2px 0 var(--cordel-border))';

interface StepSelectionCornerBadgeProps {
  isUpwardTriangle?: boolean;
}

export const StepSelectionCornerBadge: React.FC<StepSelectionCornerBadgeProps> = React.memo(
  ({ isUpwardTriangle = false }) => {
    if (isUpwardTriangle) {
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 8 8"
          className="step-selection-corner absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 pointer-events-none z-20"
        >
          <polygon points="4,0 0,8 8,8" fill="var(--cordel-accent)" />
          <line x1="0" y1="7.4" x2="8" y2="7.4" stroke="var(--cordel-on-accent)" strokeWidth="1.25" />
        </svg>
      );
    }

    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 8 8"
        className="step-selection-corner absolute top-0 right-0 w-2 h-2 pointer-events-none z-20"
      >
        <polygon points="0,0 8,0 8,8" fill="var(--cordel-accent)" />
        <polyline points="0,1.3 6.7,8" stroke="var(--cordel-border)" strokeWidth="0.8" fill="none" />
        <polyline points="0,0.4 7.6,8" stroke="var(--cordel-on-accent)" strokeWidth="1.3" fill="none" />
      </svg>
    );
  }
);

StepSelectionCornerBadge.displayName = 'StepSelectionCornerBadge';
