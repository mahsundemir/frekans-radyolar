import {Share} from 'react-native';
import {translate} from './i18n';
import type {FlatStation, NowPlaying} from './types';

// Arkadaşa anında paylaşım: radyo, çalan şarkı ve tıklanınca açılan bir bağlantı.
// Bağlantı bir web sayfasıdır (docs: depo kökündeki index.html): uygulaması olmayan da tarayıcıda dinler,
// uygulaması olan "Uygulamada aç" ile frekans:// bağlantısıyla radyoyu açar.
export const SHARE_BASE = 'https://mahsundemir.github.io/frekans-radyolar/';

export const shareUrl = (id: string) => `${SHARE_BASE}?r=${encodeURIComponent(id)}`;
export function shareMessage(
  st: FlatStation,
  meta: NowPlaying | null,
  lang: string = st.languageCode ?? 'tr',
): string {
  const song = meta && [meta.artist, meta.title].filter(Boolean).join(' — ');
  const lines = [
    song
      ? translate(lang, 'shareSong', {name: st.name, song})
      : translate(lang, 'shareNoSong', {name: st.name}),
    translate(lang, 'shareCta', {url: shareUrl(st.id)}),
  ];
  return lines.join('\n');
}

export function shareStation(st: FlatStation, meta: NowPlaying | null, lang?: string) {
  return Share.share({message: shareMessage(st, meta, lang)}).catch(() => {});
}
