
export function getGridScopedStyles(activeTool?: string): string {
  return `
    .live-playhead-highlight {
      outline: 2px solid #c23b22 !important;
      outline-offset: -2px !important;
      box-shadow: inset 0 0 0 2px #c23b22, 0 0 8px rgba(194, 59, 34, 0.6) !important;
      z-index: 20 !important;
    }
    .slider-transparent-track::-webkit-slider-runnable-track {
      background: transparent !important;
    }
    .slider-transparent-track::-moz-range-track {
      background: transparent !important;
    }
    ${activeTool === 'scissors' ? `
      .percussion-step-container input {
        cursor: inherit !important;
        user-select: none !important;
      }
    ` : ''}
  `;
}
