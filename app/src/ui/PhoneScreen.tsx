import React, {useState} from 'react';
import {Animated, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {usePlayer} from '../PlayerContext';
import {shareStation} from '../share';
import {chipFor} from '../theme';
import {FONT_DISPLAY, useColorTransition} from './Common';
import {
  HeartIcon,
  MenuIcon,
  MoonIcon,
  ShareIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
} from './Icons';
import SleepSheet from './SleepSheet';
import Waveform from './Waveform';

export default function PhoneScreen({onOpenList}: {onOpenList: () => void}) {
  const p = usePlayer();
  const insets = useSafeAreaInsets();
  const [sleepOpen, setSleepOpen] = useState(false);
  const st = p.current ?? p.stations[0];
  const bg = useColorTransition(st?.color ?? '#FF5B4A');
  if (!st) {
    return null;
  }
  const ink = st.ink;
  const chip = chipFor(ink);
  const live = p.status === 'playing' || p.status === 'buffering';
  const fav = p.isFavorite(st.id);

  const title =
    p.status === 'error'
      ? p.error ?? 'Yayın açılamadı'
      : p.status === 'buffering'
      ? 'Bağlanıyor…'
      : p.meta?.title || 'Canlı yayın';
  const artist = p.meta?.artist || st.categoryName;

  return (
    <Animated.View
      style={[
        styles.root,
        {
          backgroundColor: bg,
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(insets.bottom, 12) + 8,
        },
      ]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Arkadaşınla paylaş"
          onPress={() => shareStation(st, p.meta)}
          style={[styles.round, {backgroundColor: chip}]}>
          <ShareIcon color={ink} />
        </Pressable>
        <View style={{alignItems: 'center'}}>
          <Text style={[styles.kicker, {color: ink}]}>ŞU AN DİNLENİYOR</Text>
          <Text style={[styles.cat, {color: ink}]}>{st.categoryName}</Text>
        </View>
        <Pressable
          accessibilityLabel="Radyo listesi"
          onPress={onOpenList}
          style={[styles.round, {backgroundColor: chip}]}>
          <MenuIcon color={ink} />
        </Pressable>
      </View>

      <View>
        <View style={[styles.livePill, {backgroundColor: chip}]}>
          <View style={[styles.dot, {backgroundColor: ink, opacity: live ? 1 : 0.4}]} />
          <Text style={[styles.liveText, {color: ink}]}>CANLI</Text>
        </View>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          style={[styles.name, FONT_DISPLAY, {color: ink}]}>
          {st.name}
        </Text>
      </View>

      <Waveform
        count={32}
        barWidth={6}
        height={170}
        color={ink}
        active={p.status === 'playing'}
      />

      <View>
        <Text style={[styles.kicker, {color: ink}]}>ŞU AN ÇALIYOR</Text>
        <Text numberOfLines={2} style={[styles.track, FONT_DISPLAY, {color: ink}]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[styles.artist, {color: ink}]}>
          {artist}
        </Text>
        {p.history.length > 0 && (
          <View style={[styles.history, {borderTopColor: chip}]}>
            {p.history.map((h, i) => (
              <Text key={i} numberOfLines={1} style={[styles.histLine, {color: ink}]}>
                {i === 0 ? 'Az önce' : 'Daha önce'} ·{' '}
                {[h.title, h.artist].filter(Boolean).join(' — ')}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          onPress={() => p.toggleFavorite(st.id)}
          style={styles.side}>
          <HeartIcon color={ink} filled={fav} />
        </Pressable>
        <Pressable accessibilityLabel="Önceki radyo" onPress={p.prev} style={styles.skip}>
          <PrevIcon size={30} color={ink} />
        </Pressable>
        <Pressable
          accessibilityLabel={live ? 'Duraklat' : 'Oynat'}
          onPress={p.toggle}
          style={[styles.play, {backgroundColor: ink}]}>
          {live ? (
            <PauseIcon size={34} color={st.color} />
          ) : (
            <PlayIcon size={34} color={st.color} />
          )}
        </Pressable>
        <Pressable accessibilityLabel="Sonraki radyo" onPress={p.next} style={styles.skip}>
          <NextIcon size={30} color={ink} />
        </Pressable>
        <Pressable
          accessibilityLabel="Uyku zamanlayıcı"
          onPress={() => setSleepOpen(o => !o)}
          style={styles.side}>
          <MoonIcon color={ink} filled={!!p.sleepEnd} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dialScroll}
        contentContainerStyle={styles.dial}>
        {p.stations.map(s => {
          const sel = s.id === st.id;
          return (
            <Pressable
              key={s.id}
              accessibilityLabel={s.name}
              onPress={() => p.select(s)}
              style={[
                styles.dialItem,
                {borderColor: ink, backgroundColor: sel ? ink : 'transparent'},
              ]}>
              <Text style={[styles.dialText, {color: sel ? st.color : ink}]}>
                {s.short}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {sleepOpen && (
        <View style={[styles.sleepWrap, {bottom: Math.max(insets.bottom, 12) + 70}]}>
          <SleepSheet color={st.color} ink={st.ink} onClose={() => setSleepOpen(false)} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, paddingHorizontal: 24, justifyContent: 'space-between'},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {fontSize: 10, fontWeight: '700', letterSpacing: 1.4, opacity: 0.85},
  cat: {fontSize: 14, fontWeight: '700'},
  livePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 26,
    paddingHorizontal: 12,
    borderRadius: 13,
  },
  dot: {width: 8, height: 8, borderRadius: 4},
  liveText: {fontSize: 11, fontWeight: '700', letterSpacing: 1.3},
  name: {fontSize: 60, lineHeight: 58, marginTop: 12, minHeight: 116},
  track: {fontSize: 28, lineHeight: 30, marginTop: 6},
  artist: {fontSize: 18, marginTop: 4, opacity: 0.85},
  history: {marginTop: 14, paddingTop: 12, borderTopWidth: 1, gap: 2},
  histLine: {fontSize: 13, opacity: 0.85},
  controls: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  side: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  skip: {width: 56, height: 56, alignItems: 'center', justifyContent: 'center'},
  play: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepWrap: {position: 'absolute', left: 24, right: 24},
  dialScroll: {flexGrow: 0, flexShrink: 0},
  dial: {alignItems: 'center', gap: 10, paddingVertical: 2},
  dialItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialText: {fontSize: 12, fontWeight: '800'},
});
