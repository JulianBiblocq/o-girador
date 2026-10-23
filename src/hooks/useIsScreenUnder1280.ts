/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Hook réactif pour détecter le seuil < 1280px (tablettes et fenêtres réduites).
 */
import { useState, useEffect } from 'react';

export function useIsScreenUnder1280(): boolean {
  const [isUnder1280, setIsUnder1280] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1280;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 1279px)');
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsUnder1280(e.matches);
    };

    setIsUnder1280(mql.matches);

    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    } else {
      (mql as any).addListener(onChange);
      return () => (mql as any).removeListener(onChange);
    }
  }, []);

  return isUnder1280;
}
