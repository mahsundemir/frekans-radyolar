import {useEffect, useState} from 'react';
import {loadJson} from './storage';

// GEÇİCİ: mağaza ekran görüntüsü çekimi için. Çekimden sonra silinecek.
export type Shot = {screen?: 'player' | 'stations'; query?: string; sleep?: boolean; scroll?: number};

export function useShot(): Shot {
  const [s, setS] = useState<Shot>({});
  useEffect(() => {
    const t = setInterval(async () => {
      const v = (await loadJson<Shot>('frekans.shot')) ?? {};
      setS(prev => (JSON.stringify(prev) === JSON.stringify(v) ? prev : v));
    }, 400);
    return () => clearInterval(t);
  }, []);
  return s;
}
