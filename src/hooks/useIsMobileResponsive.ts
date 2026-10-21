/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

/**
 * Reactive responsive listener for viewport breakpoint (< 768px by default).
 * Updates in real-time when resizing the window on desktop or on mobile orientation change.
 */
export function useIsMobileResponsive(breakpointPx: number = 768): boolean {
  const query = `(max-width: ${breakpointPx - 1}px)`;
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    setIsMobile(mql.matches);

    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    } else {
      (mql as any).addListener(onChange);
      return () => (mql as any).removeListener(onChange);
    }
  }, [query]);

  return isMobile;
}
