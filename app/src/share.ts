import {Share} from 'react-native';
import type {FlatStation, NowPlaying} from './types';

// Arkadaşa anında paylaşım: radyo, çalan şarkı ve tıklanınca açılan bir bağlantı.
// Bağlantı bir web sayfasıdır (docs: depo kökündeki index.html): uygulaması olmayan da tarayıcıda dinler,
// uygulaması olan "Uygulamada aç" ile frekans:// bağlantısıyla radyoyu açar.
export const SHARE_BASE = 'https://mahsundemir.github.io/frekans-radyolar/';

export const shareUrl = (id: string) => `${SHARE_BASE}?r=${encodeURIComponent(id)}`;
export function shareMessage(st: FlatStation, meta: NowPlaying | null): string {
  const song = meta && [meta.artist, meta.title].filter(Boolean).join(' — ');
  const lines = [
    song
      ? `Şu an ${st.name} dinliyorum: ${song}`
      : `Şu an ${st.name} dinliyorum.`,
    `Sen de dinle: ${shareUrl(st.id)}`,
  ];
  return lines.join('\n');
}

export function shareStation(st: FlatStation, meta: NowPlaying | null) {
  return Share.share({message: shareMessage(st, meta)}).catch(() => {});
}
