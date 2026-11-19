import { useEffect, useState } from 'react';

export function useIsFocusCompactViewport(compactProp: boolean): boolean {
  const [isUnder640, setIsUnder640] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    if (compactProp || typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 639px)');
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => setIsUnder640(e.matches);
    setIsUnder640(mql.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    (mql as any).addListener(onChange);
    return () => (mql as any).removeListener(onChange);
  }, [compactProp]);

  return compactProp || isUnder640;
}
