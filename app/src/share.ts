import {Share} from 'react-native';
import type {FlatStation, NowPlaying} from './types';

// Arkadaşa anında paylaşım: radyo, çalan şarkı ve doğrudan yayın adresi.
// Yayın adresi herhangi bir oynatıcıda açılır, arkadaşın uygulamaya sahip olması gerekmez.
export function shareMessage(st: FlatStation, meta: NowPlaying | null): string {
  const song = meta && [meta.artist, meta.title].filter(Boolean).join(' — ');
  const lines = [
    song
      ? `Şu an ${st.name} dinliyorum: ${song}`
      : `Şu an ${st.name} dinliyorum.`,
    `Sen de dinle: ${st.streamUrl}`,
  ];
  return lines.join('\n');
}

export function shareStation(st: FlatStation, meta: NowPlaying | null) {
  return Share.share({message: shareMessage(st, meta)}).catch(() => {});
}
