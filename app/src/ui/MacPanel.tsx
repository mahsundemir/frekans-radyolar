import React, {useState} from 'react';
import {Animated, NativeModules, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {usePlayer} from '../PlayerContext';
import {colors} from '../theme';
import {FONT_DISPLAY, Mono, useColorTransition, VolumeBar} from './Common';
import {
  MoonIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  SlidersIcon,
  VolumeIcon,
} from './Icons';
import StationsScreen from './StationsScreen';
import Waveform from './Waveform';

// Menü çubuğu paneli: canlı yayın kartı, kontroller, kategori filtresi, radyo listesi
export default function MacPanel() {
  const p = usePlayer();
  const [cat, setCat] = useState('all');
  const [settings, setSettings] = useState(false);
  const st = p.current ?? p.stations[0];
  const bg = useColorTransition(st?.color ?? '#FF5B4A');
  if (!st) {
    return null;
  }
  if (settings) {
    return <StationsScreen onBack={() => setSettings(false)} />;
  }

  const live = p.status === 'playing' || p.status === 'buffering';
  const cats = [
    {id: 'all', name: 'Tümü'},
    ...Array.from(
      new Map(p.stations.map(s => [s.categoryId, s.categoryName])).entries(),
    ).map(([id, name]) => ({id, name})),
  ];
  const rows = p.stations.filter(s => cat === 'all' || s.categoryId === cat);
  const title =
    p.status === 'error'
      ? p.error ?? 'Yayın açılamadı'
      : p.status === 'buffering'
      ? 'Bağlanıyor…'
      : p.meta?.title || 'Canlı yayın';
  const artist = p.meta?.artist || st.categoryName;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.hero, {backgroundColor: bg}]}>
        <View style={styles.heroTop}>
          <View style={styles.liveRow}>
            <View style={[styles.dot, {backgroundColor: st.ink, opacity: live ? 1 : 0.4}]} />
            <Text style={[styles.heroKicker, {color: st.ink}]}>CANLI</Text>
          </View>
          <Text style={[styles.heroKicker, {color: st.ink}]}>{st.categoryName}</Text>
        </View>
        <View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.heroName, FONT_DISPLAY, {color: st.ink}]}>
            {st.name}
          </Text>
          <Text numberOfLines={1} style={[styles.heroTrack, {color: st.ink}]}>
            <Text style={{fontWeight: '700'}}>{title}</Text>
            <Text style={{opacity: 0.8}}> · {artist}</Text>
          </Text>
        </View>
        <Waveform
          count={40}
          barWidth={4}
          height={44}
          color={st.ink}
          active={p.status === 'playing'}
        />
      </Animated.View>

      <View style={styles.controls}>
        <VolumeIcon color={colors.muted} />
        <VolumeBar value={p.volume} color={st.color} onChange={p.setVolume} />
        <Pressable accessibilityLabel="Önceki radyo" onPress={p.prev} style={styles.skip}>
          <PrevIcon size={22} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityLabel={live ? 'Duraklat' : 'Oynat'}
          onPress={p.toggle}
          style={[styles.play, {backgroundColor: st.color}]}>
          {live ? <PauseIcon color={st.ink} /> : <PlayIcon color={st.ink} />}
        </Pressable>
        <Pressable accessibilityLabel="Sonraki radyo" onPress={p.next} style={styles.skip}>
          <NextIcon size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll} contentContainerStyle={styles.pills}>
        {cats.map(c => (
          <Pressable
            key={c.id}
            onPress={() => setCat(c.id)}
            style={[styles.pill, c.id === cat && {backgroundColor: colors.text}]}>
            <Text style={[styles.pillText, c.id === cat && {color: colors.ink}]}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.list}>
        {rows.map(s => {
          const active = s.id === st.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => p.select(s)}
              style={[styles.row, active && {backgroundColor: colors.surface2}]}>
              <Mono text={s.short} color={s.color} ink={s.ink} />
              <View style={{flex: 1}}>
                <Text style={styles.rowName}>{s.name}</Text>
                <Text numberOfLines={1} style={styles.rowSub}>
                  {s.categoryName}
                </Text>
              </View>
              {active && live && (
                <Waveform count={3} barWidth={3} height={14} gap={2} color={s.color} active={p.status === 'playing'} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={() => setSettings(true)} style={styles.footBtn}>
          <SlidersIcon color={colors.muted} />
          <Text style={styles.footText}>Ayarlar</Text>
        </Pressable>
        <Pressable style={styles.footBtn}>
          <MoonIcon size={18} color={colors.muted} />
          <Text style={styles.footText}>Uyku zamanlayıcı</Text>
        </Pressable>
        <Pressable
          onPress={() => NativeModules.FrekansAudio?.quit()}
          style={styles.footBtn}>
          <Text style={styles.footText}>Çık</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg, padding: 12},
  hero: {
    height: 216,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  heroTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  liveRow: {flexDirection: 'row', alignItems: 'center', gap: 7},
  dot: {width: 8, height: 8, borderRadius: 4},
  heroKicker: {fontSize: 11, fontWeight: '700', letterSpacing: 1.3},
  heroName: {fontSize: 38, lineHeight: 38},
  heroTrack: {fontSize: 14, marginTop: 8},
  controls: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 14, paddingHorizontal: 4},
  skip: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  play: {width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center'},
  pillScroll: {flexGrow: 0},
  pills: {gap: 6, paddingTop: 14, paddingBottom: 10},
  pill: {height: 30, paddingHorizontal: 13, borderRadius: 15, backgroundColor: colors.surface2, justifyContent: 'center'},
  pillText: {color: '#C9C5D8', fontSize: 13, fontWeight: '500'},
  list: {flex: 1},
  row: {height: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, borderRadius: 12, marginBottom: 4},
  rowName: {color: colors.text, fontSize: 14, fontWeight: '700'},
  rowSub: {color: colors.muted, fontSize: 12},
  footer: {
    marginTop: 8,
    paddingTop: 10,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footBtn: {flexDirection: 'row', alignItems: 'center', gap: 8},
  footText: {color: colors.muted, fontSize: 13},
});
