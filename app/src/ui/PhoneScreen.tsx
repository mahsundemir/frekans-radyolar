import React, {useState} from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {usePlayer} from '../PlayerContext';
import {shareStation} from '../share';
import {chipFor, colors} from '../theme';
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
import SleepSheet from './SleepSheet';
import Waveform from './Waveform';

export default function PhoneScreen({onOpenList}: {onOpenList: () => void}) {
  const p = usePlayer();
  const insets = useSafeAreaInsets();
  const {height} = useWindowDimensions();
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

  // Favori varsa yalnızca favoriler, yoksa tüm radyolar
  const favList = p.stations.filter(s => p.favorites.includes(s.id));
  const showFavs = favList.length > 0;
  const list = showFavs ? favList : p.stations;
  const sheetH = Math.round(height * 0.4);

  const title =
    p.status === 'error'
      ? p.error ?? 'Yayın açılamadı'
      : p.status === 'buffering'
      ? 'Bağlanıyor…'
      : p.meta?.title || 'Canlı yayın';
  const artist = p.meta?.artist || st.categoryName;

  return (
    <Animated.View style={[styles.root, {backgroundColor: bg}]}>
      <View style={[styles.top, {paddingTop: insets.top + 8}]}>
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
            accessibilityLabel="Radyo ayarları"
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
          barWidth={5}
          height={72}
          color={ink}
          active={p.status === 'playing'}
        />

        <View>
          <Text numberOfLines={1} style={[styles.track, FONT_DISPLAY, {color: ink}]}>
            {title}
          </Text>
          <Text numberOfLines={1} style={[styles.artist, {color: ink}]}>
            {artist}
          </Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            accessibilityLabel={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            onPress={() => p.toggleFavorite(st.id)}
            style={styles.side}>
            <HeartIcon color={ink} filled={fav} />
          </Pressable>
          <Pressable accessibilityLabel="Önceki radyo" onPress={p.prev} style={styles.skip}>
            <PrevIcon size={28} color={ink} />
          </Pressable>
          <Pressable
            accessibilityLabel={live ? 'Duraklat' : 'Oynat'}
            onPress={p.toggle}
            style={[styles.play, {backgroundColor: ink}]}>
            {live ? (
              <PauseIcon size={30} color={st.color} />
            ) : (
              <PlayIcon size={30} color={st.color} />
            )}
          </Pressable>
          <Pressable accessibilityLabel="Sonraki radyo" onPress={p.next} style={styles.skip}>
            <NextIcon size={28} color={ink} />
          </Pressable>
          <Pressable
            accessibilityLabel="Uyku zamanlayıcı"
            onPress={() => setSleepOpen(o => !o)}
            style={styles.side}>
            <MoonIcon color={ink} filled={!!p.sleepEnd} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.sheet, {height: sheetH, paddingBottom: Math.max(insets.bottom, 8)}]}>
        <View style={styles.sheetHead}>
          {showFavs && <HeartIcon size={14} color={colors.text} filled />}
          <Text style={styles.sheetTitle}>
            {showFavs ? 'Favoriler' : 'Tüm radyolar'}
          </Text>
          <Text style={styles.sheetCount}>· {list.length}</Text>
          <Text style={styles.sheetHint}>renk için basılı tut</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {list.map(s => {
            const active = s.id === st.id;
            const isFav = p.isFavorite(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => p.select(s)}
                onLongPress={() => p.pickColor(s.id)}
                style={[styles.row, active && {backgroundColor: colors.surface2}]}>
                <Badge station={s} active={active} size={40} />
                <View style={{flex: 1}}>
                  <Text numberOfLines={1} style={styles.rowName}>{s.name}</Text>
                  <Text numberOfLines={1} style={styles.rowSub}>{s.categoryName}</Text>
                </View>
                {active && live && (
                  <Waveform count={4} barWidth={3} height={16} gap={2} color={s.color} active={p.status === 'playing'} />
                )}
                <Pressable
                  accessibilityLabel={isFav ? `${s.name} favorilerden çıkar` : `${s.name} favorilere ekle`}
                  onPress={() => p.toggleFavorite(s.id)}
                  style={styles.rowHeart}>
                  <HeartIcon size={20} color={isFav ? s.color : colors.muted} filled={isFav} />
                </Pressable>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {sleepOpen && (
        <View style={[styles.sleepWrap, {bottom: sheetH + 8}]}>
          <SleepSheet color={st.color} ink={st.ink} onClose={() => setSleepOpen(false)} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  top: {flex: 1, paddingHorizontal: 24, paddingBottom: 12, justifyContent: 'space-between'},
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
    height: 24,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  dot: {width: 8, height: 8, borderRadius: 4},
  liveText: {fontSize: 11, fontWeight: '700', letterSpacing: 1.3},
  name: {fontSize: 46, lineHeight: 46, marginTop: 8},
  track: {fontSize: 24, lineHeight: 28},
  artist: {fontSize: 16, marginTop: 2, opacity: 0.85},
  controls: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  side: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  skip: {width: 50, height: 50, alignItems: 'center', justifyContent: 'center'},
  play: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 14,
    paddingHorizontal: 12,
  },
  sheetHead: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 8},
  sheetTitle: {color: colors.text, fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase'},
  sheetCount: {color: colors.muted, fontSize: 13},
  sheetHint: {color: colors.muted, fontSize: 11, marginLeft: 'auto', opacity: 0.8},
  row: {height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 8, paddingRight: 4, borderRadius: 14},
  rowName: {color: colors.text, fontSize: 15, fontWeight: '700'},
  rowSub: {color: colors.muted, fontSize: 12},
  rowHeart: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  sleepWrap: {position: 'absolute', left: 24, right: 24},
});
