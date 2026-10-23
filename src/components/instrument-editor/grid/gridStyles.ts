
export function getGridScopedStyles(activeTool?: string): string {
  return `
    .live-playhead-highlight {
      background-color: #1a1a1a !important;
      color: #f4ecd8 !important;
      border-color: #8b2a1a !important;
      box-shadow: 0 0 8px rgba(139, 42, 26, 0.6) !important;
      transform: scale(1.1) !important;
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
