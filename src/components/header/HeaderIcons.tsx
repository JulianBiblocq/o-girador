import React from 'react';

export const UndoIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="3.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path
      d="M 16 28 L 41 12 L 36 25 C 64 20, 82 42, 80 74 C 79 84, 75 90, 70 92 C 72 84, 74 72, 66 54 C 57 37, 43 29, 36 31 L 41 45 L 16 28 Z"
      fill="#ffd369"
    />
    <path
      d="M 46 36 C 56 34, 66 44, 69 57"
      strokeDasharray="2 3"
      strokeWidth="1.5"
    />
  </svg>
);

export const RedoIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    style={{ transform: 'scaleX(-1)' }}
    fill="none"
    stroke="currentColor"
    strokeWidth="3.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path
      d="M 16 28 L 41 12 L 36 25 C 64 20, 82 42, 80 74 C 79 84, 75 90, 70 92 C 72 84, 74 72, 66 54 C 57 37, 43 29, 36 31 L 41 45 L 16 28 Z"
      fill="#ffd369"
    />
    <path
      d="M 46 36 C 56 34, 66 44, 69 57"
      strokeDasharray="2 3"
      strokeWidth="1.5"
    />
  </svg>
);
