import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {usePlayer} from '../PlayerContext';
import {colors} from '../theme';
import Badge from './Badge';
import {HeartIcon, MenuIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon} from './Icons';
import Marquee from './Marquee';
import Waveform from './Waveform';

// Genişlemiş ada (kısa kart): iPhone'daki Dynamic Island ile aynı düzen.
// Radyo + kayan şarkı + dalga, oynatma düğmeleri ve hızlı radyo seçimi. Listeye geçmek için sağdaki düğme.
export default function MacCard({onOpenList}: {onOpenList: () => void}) {
  const p = usePlayer();
  const st = p.current ?? p.stations[0];
  if (!st) {
    return null;
  }
  const live = p.status === 'playing' || p.status === 'buffering';
  const song = [p.meta?.artist, p.meta?.title].filter(Boolean).join(' — ');
  const line =
    p.status === 'error'
      ? p.error ?? 'Yayın açılamadı'
      : p.status === 'buffering'
      ? 'Bağlanıyor…'
      : song || 'Canlı yayın';
  const fav = p.isFavorite(st.id);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Badge station={st} active size={44} />
        <View style={{flex: 1}}>
          <Text numberOfLines={1} style={styles.name}>{st.name}</Text>
          <Marquee text={line} style={styles.song} />
        </View>
        <Waveform count={5} barWidth={3} height={22} gap={3} color={st.color} active={p.status === 'playing'} />
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          onPress={() => p.toggleFavorite(st.id)}
          style={styles.side}>
          <HeartIcon size={22} color={colors.text} filled={fav} />
        </Pressable>
        <Pressable accessibilityLabel="Önceki radyo" onPress={p.prev} style={styles.skip}>
          <PrevIcon size={24} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityLabel={live ? 'Duraklat' : 'Oynat'}
          onPress={p.toggle}
          style={[styles.play, {backgroundColor: st.color}]}>
          {live ? <PauseIcon size={22} color={st.ink} /> : <PlayIcon size={22} color={st.ink} />}
        </Pressable>
        <Pressable accessibilityLabel="Sonraki radyo" onPress={p.next} style={styles.skip}>
          <NextIcon size={24} color={colors.text} />
        </Pressable>
        <Pressable accessibilityLabel="Radyo listesi ve arama" onPress={onOpenList} style={styles.side}>
          <MenuIcon size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.quick}>
        {p.quick.map(s => {
          const active = s.id === st.id;
          return (
            <Pressable
              key={s.id}
              accessibilityLabel={s.name}
              onPress={() => p.select(s)}
              onLongPress={() => p.pickColor(s.id)}
              style={[styles.quickItem, active && {borderColor: colors.text}]}>
              <Badge station={s} active={active} size={32} circle />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14, justifyContent: 'space-between'},
  top: {flexDirection: 'row', alignItems: 'center', gap: 12},
  name: {color: '#FFFFFF', fontSize: 16, fontWeight: '800'},
  song: {color: colors.muted, fontSize: 13, fontWeight: '500'},
  controls: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8},
  side: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  skip: {width: 44, height: 40, alignItems: 'center', justifyContent: 'center'},
  play: {width: 56, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  quick: {flexDirection: 'row', justifyContent: 'center', gap: 14},
  quickItem: {width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center'},
});
