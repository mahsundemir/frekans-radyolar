import {inkFor} from './theme';
import type {FlatStation, StationsFile} from './types';

export const STATIONS_URL =
  'https://raw.githubusercontent.com/mahsundemir/frekans-radyolar/main/stations.json';

// Uygulamayla birlikte gelen kopya: internet yokken ve ilk açılışta kullanılır.
// Tek kaynak depo kökündeki stations.json (metro.config.js üst klasörü izler).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bundled: StationsFile = require('../../stations.json');

export function bundledStations(): StationsFile {
  return bundled;
}

function isValid(x: any): x is StationsFile {
  return (
    x &&
    typeof x.version === 'number' &&
    Array.isArray(x.languages) &&
    x.languages.every(
      (l: any) =>
        typeof l.code === 'string' &&
        Array.isArray(l.categories) &&
        l.categories.every((c: any) => Array.isArray(c.stations)),
    )
  );
}

// Güncel listeyi çeker. Daha eski ya da bozuk bir sürüm gelirse mevcut liste korunur.
export async function fetchStations(
  current: StationsFile,
): Promise<StationsFile> {
  const res = await fetch(`${STATIONS_URL}?t=${Date.now()}`);
  if (!res.ok) {
    throw new Error(`Liste alınamadı (${res.status})`);
  }
  const next = await res.json();
  if (!isValid(next)) {
    throw new Error('Liste biçimi geçersiz');
  }
  return next.version >= current.version ? next : current;
}

export function flatten(file: StationsFile): FlatStation[] {
  const out: FlatStation[] = [];
  for (const l of file.languages) {
    for (const c of l.categories) {
      for (const s of c.stations) {
        out.push({
          ...s,
          color: c.color,
          ink: inkFor(c.color),
          categoryId: c.id,
          categoryName: c.name,
          languageCode: l.code,
        });
      }
    }
  }
  return out;
}
