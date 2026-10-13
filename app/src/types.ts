export type Metadata = 'icy' | 'hls' | 'none';

export type Station = {
  id: string;
  name: string;
  short: string;
  logo?: string; // isteğe bağlı; yoksa ya da açılmazsa baş harfler görünür
  streamUrl: string;
  metadata: Metadata;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  stations: Station[];
};

export type Language = {
  code: string;
  name: string;
  categories: Category[];
};

export type StationsFile = {
  version: number;
  updatedAt: string;
  languages: Language[];
};

// Listede düzleştirilmiş radyo: kategori ve dil bilgisiyle birlikte
export type FlatStation = Station & {
  color: string;
  ink: string;
  categoryId: string;
  categoryName: string;
  languageCode: string;
};

export type PlayerStatus = 'idle' | 'buffering' | 'playing' | 'paused' | 'error';

export type NowPlaying = {title: string; artist: string};
