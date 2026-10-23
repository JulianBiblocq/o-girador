
import { useState, useEffect } from 'react';

export function useApitoShake(): boolean {
  const [isCenterShaking, setIsCenterShaking] = useState(false);

  useEffect(() => {
    let timerId: any = null;
    const handleApito = () => {
      if (timerId) clearTimeout(timerId);
      setIsCenterShaking(true);
      timerId = setTimeout(() => setIsCenterShaking(false), 300);
    };

    window.addEventListener('o-girador-apito-shake', handleApito);
    return () => {
      window.removeEventListener('o-girador-apito-shake', handleApito);
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  return isCenterShaking;
}
