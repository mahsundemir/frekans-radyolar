import React, {useRef, useState} from 'react';
import {Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {usePlayer} from '../PlayerContext';
import {shareStation} from '../share';
import {chipFor} from '../theme';
import Badge from './Badge';
import {FONT_DISPLAY, useColorTransition} from './Common';
import {
  HeartIcon,
  MenuIcon,
  MoonIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  ShareIcon,
} from './Icons';
import RadioSheet from './RadioSheet';
import SleepSheet from './SleepSheet';
import Waveform from './Waveform';

// iPhone oynatıcı: tasarımdaki gibi tam renkli ekran. Alttaki küçük daireler favorileri
// (favori yoksa radyoları) gösterir; listeye aşağıdan yukarı kayan sayfayla ulaşılır.
export default function PhoneScreen({onOpenList}: {onOpenList: () => void}) {
  const p = usePlayer();
  const insets = useSafeAreaInsets();
  const [sleepOpen, setSleepOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const st = p.current ?? p.stations[0];
  const bg = useColorTransition(st?.color ?? '#FF5B4A');

  // Alt satırı yukarı kaydırınca liste açılır (yatay kaydırmayla çakışmaz)
  const openRef = useRef(() => setListOpen(true));
  openRef.current = () => setListOpen(true);
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => g.dy < -12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderRelease: (_e, g) => {
        if (g.dy < -30) {
          openRef.current();
        }
      },
    }),
  ).current;

  if (!st) {
    return null;
  }
  const ink = st.ink;
  const chip = chipFor(ink);
  const live = p.status === 'playing' || p.status === 'buffering';
  const fav = p.isFavorite(st.id);

  // Favori varsa yalnızca favoriler, yoksa tüm radyolar
  const favList = p.stations.filter(s => p.favorites.includes(s.id));
  const dial = favList.length > 0 ? favList : p.stations;

  const title =
    p.status === 'error'
      ? p.error ?? p.t('streamFailed')
      : p.status === 'buffering'
      ? p.t('connecting')
      : p.meta?.title || p.t('liveStream');
  const artist = p.meta?.artist || st.categoryName;

  return (
    <Animated.View
      style={[
        styles.root,
        {backgroundColor: bg, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) + 8},
      ]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel={p.t('share')}
          onPress={() => shareStation(st, p.meta)}
          style={[styles.round, {backgroundColor: chip}]}>
          <ShareIcon color={ink} />
        </Pressable>
        <View style={{alignItems: 'center'}}>
          <Text style={[styles.kicker, {color: ink}]}>{p.t('nowListening')}</Text>
          <Text style={[styles.cat, {color: ink}]}>{st.categoryName}</Text>
        </View>
        <Pressable
          accessibilityLabel={p.t('radioSettings')}
          onPress={onOpenList}
          style={[styles.round, {backgroundColor: chip}]}>
          <MenuIcon color={ink} />
        </Pressable>
      </View>

      <View>
        <View style={[styles.livePill, {backgroundColor: chip}]}>
          <View style={[styles.dot, {backgroundColor: ink, opacity: live ? 1 : 0.4}]} />
          <Text style={[styles.liveText, {color: ink}]}>{p.t('liveBadge')}</Text>
        </View>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          style={[styles.name, FONT_DISPLAY, {color: ink}]}>
          {st.name}
        </Text>
      </View>

      <Waveform count={32} barWidth={6} height={170} color={ink} active={p.status === 'playing'} />

      <View>
        <Text style={[styles.kicker, {color: ink}]}>{p.t('nowPlaying')}</Text>
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
                {i === 0 ? p.t('justNow') : p.t('earlier')} · {[h.title, h.artist].filter(Boolean).join(' — ')}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={fav ? p.t('favRemove') : p.t('favAdd')}
          onPress={() => p.toggleFavorite(st.id)}
          style={styles.side}>
          <HeartIcon color={ink} filled={fav} />
        </Pressable>
        <Pressable accessibilityLabel={p.t('prevRadio')} onPress={p.prev} style={styles.skip}>
          <PrevIcon size={30} color={ink} />
        </Pressable>
        <Pressable
          accessibilityLabel={live ? p.t('pause') : p.t('play')}
          onPress={p.toggle}
          style={[styles.play, {backgroundColor: ink}]}>
          {live ? <PauseIcon size={34} color={st.color} /> : <PlayIcon size={34} color={st.color} />}
        </Pressable>
        <Pressable accessibilityLabel={p.t('nextRadio')} onPress={p.next} style={styles.skip}>
          <NextIcon size={30} color={ink} />
        </Pressable>
        <Pressable
          accessibilityLabel={p.t('sleepTimer')}
          onPress={() => setSleepOpen(o => !o)}
          style={styles.side}>
          <MoonIcon color={ink} filled={!!p.sleepEnd} />
        </Pressable>
      </View>

      <View {...swipe.panHandlers}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dialScroll}
          contentContainerStyle={styles.dial}>
          {dial.map(s => {
            const sel = s.id === st.id;
            return (
              <Pressable
                key={s.id}
                accessibilityLabel={s.name}
                onPress={() => p.select(s)}
                onLongPress={() => p.pickColor(s.id)}
                style={[styles.dialItem, sel && {borderColor: ink}]}>
                <Badge station={s} active={sel} size={34} circle />
              </Pressable>
            );
          })}
          <Pressable
            accessibilityLabel={p.t('openAll')}
            onPress={() => setListOpen(true)}
            style={[styles.dialItem, {backgroundColor: chip, borderColor: 'transparent'}]}>
            <MenuIcon size={18} color={ink} />
          </Pressable>
        </ScrollView>
      </View>

      {sleepOpen && (
        <View style={[styles.sleepWrap, {bottom: Math.max(insets.bottom, 12) + 80}]}>
          <SleepSheet color={st.color} ink={st.ink} onClose={() => setSleepOpen(false)} />
        </View>
      )}

      <RadioSheet open={listOpen} onClose={() => setListOpen(false)} />
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
  dialScroll: {flexGrow: 0, flexShrink: 0},
  dial: {alignItems: 'center', gap: 12, paddingVertical: 2},
  dialItem: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepWrap: {position: 'absolute', left: 24, right: 24},
});
