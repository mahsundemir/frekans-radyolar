import React, {useState} from 'react';
import {
  Animated,
  NativeModules,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {ALL, FAVORITES, filterStations} from '../filter';
import {usePlayer} from '../PlayerContext';
import {shareStation} from '../share';
import {colors} from '../theme';
import {FONT_DISPLAY, useColorTransition, VolumeBar} from './Common';
import Badge from './Badge';
import {
  HeartIcon,
  MoonIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  SearchIcon,
  ShareIcon,
  SlidersIcon,
  VolumeIcon,
} from './Icons';
import SleepSheet from './SleepSheet';
import StationsScreen from './StationsScreen';
import Waveform from './Waveform';

// Menü çubuğu paneli: canlı yayın kartı, kontroller, arama, kategori filtresi, radyo listesi
export default function MacPanel({onCollapse}: {onCollapse?: () => void}) {
  const p = usePlayer();
  const [cat, setCat] = useState(ALL);
  const [query, setQuery] = useState('');
  const [settings, setSettings] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
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
    {id: ALL, name: 'Tümü'},
    {id: FAVORITES, name: `Favoriler${p.favorites.length ? ` · ${p.favorites.length}` : ''}`},
    ...Array.from(
      new Map(p.stations.map(s => [s.categoryId, s.categoryName])).entries(),
    ).map(([id, name]) => ({id, name})),
  ];
  const rows = filterStations(p.stations, {
    category: cat,
    query,
    favorites: p.favorites,
  });
  const title =
    p.status === 'error'
      ? p.error ?? 'Yayın açılamadı'
      : p.status === 'buffering'
      ? 'Bağlanıyor…'
      : p.meta?.title || 'Canlı yayın';
  const artist = p.meta?.artist || st.categoryName;
  const fav = p.isFavorite(st.id);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.hero, {backgroundColor: bg}]}>
        <View style={styles.heroTop}>
          <View style={styles.liveRow}>
            <View style={[styles.dot, {backgroundColor: st.ink, opacity: live ? 1 : 0.4}]} />
            <Text style={[styles.heroKicker, {color: st.ink}]}>CANLI</Text>
          </View>
          <View style={styles.liveRow}>
            <Text style={[styles.heroKicker, {color: st.ink}]}>{st.categoryName}</Text>
            <Pressable
              accessibilityLabel="Arkadaşınla paylaş"
              onPress={() => shareStation(st, p.meta)}
              style={styles.heroHeart}>
              <ShareIcon size={20} color={st.ink} />
            </Pressable>
            <Pressable
              accessibilityLabel={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
              onPress={() => p.toggleFavorite(st.id)}
              style={styles.heroHeart}>
              <HeartIcon size={20} color={st.ink} filled={fav} />
            </Pressable>
          </View>
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

      <View style={styles.search}>
        <SearchIcon color={colors.muted} />
        <TextInput
          {...({enableFocusRing: false} as object)}
          value={query}
          onChangeText={setQuery}
          placeholder="Radyo ara"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        {query.length > 0 && (
          <Pressable accessibilityLabel="Aramayı temizle" onPress={() => setQuery('')}>
            <Text style={styles.clear}>Temizle</Text>
          </Pressable>
        )}
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
        {rows.length === 0 && (
          <Text style={styles.empty}>
            {cat === FAVORITES && !query
              ? 'Henüz favori yok. Radyonun yanındaki kalbe dokun.'
              : 'Sonuç bulunamadı.'}
          </Text>
        )}
        {rows.map(s => {
          const active = s.id === st.id;
          const isFav = p.isFavorite(s.id);
          return (
            <Pressable
              key={s.id}
              onPress={() => p.select(s)}
              style={[styles.row, active && {backgroundColor: colors.surface2}]}>
              <Badge station={s} active={active} />
              <View style={{flex: 1}}>
                <Text style={styles.rowName}>{s.name}</Text>
                <Text numberOfLines={1} style={styles.rowSub}>
                  {s.categoryName}
                </Text>
              </View>
              {active && live && (
                <Waveform count={3} barWidth={3} height={14} gap={2} color={s.color} active={p.status === 'playing'} />
              )}
              <Pressable
                accessibilityLabel={isFav ? `${s.name} favorilerden çıkar` : `${s.name} favorilere ekle`}
                onPress={() => p.toggleFavorite(s.id)}
                style={styles.rowHeart}>
                <HeartIcon size={18} color={isFav ? s.color : colors.muted} filled={isFav} />
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>

      {sleepOpen && (
        <View style={styles.sleepWrap}>
          <SleepSheet color={st.color} ink={st.ink} onClose={() => setSleepOpen(false)} />
        </View>
      )}

      <View style={styles.footer}>
        <Pressable onPress={() => setSettings(true)} style={styles.footBtn}>
          <SlidersIcon color={colors.muted} />
          <Text style={styles.footText}>Ayarlar</Text>
        </Pressable>
        <Pressable onPress={() => setSleepOpen(o => !o)} style={styles.footBtn}>
          <MoonIcon size={18} color={p.sleepEnd ? st.color : colors.muted} />
          <Text style={[styles.footText, p.sleepEnd ? {color: st.color} : null]}>
            {p.sleepEnd ? 'Uyku zamanlayıcı açık' : 'Uyku zamanlayıcı'}
          </Text>
        </Pressable>
        {onCollapse && (
          <Pressable onPress={onCollapse} style={styles.footBtn}>
            <Text style={styles.footText}>Küçült</Text>
          </Pressable>
        )}
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
  heroHeart: {width: 28, height: 28, alignItems: 'center', justifyContent: 'center'},
  dot: {width: 8, height: 8, borderRadius: 4},
  heroKicker: {fontSize: 11, fontWeight: '700', letterSpacing: 1.3},
  heroName: {fontSize: 38, lineHeight: 38},
  heroTrack: {fontSize: 14, marginTop: 8},
  controls: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 14, paddingHorizontal: 4},
  skip: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  play: {width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center'},
  search: {
    marginTop: 14,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  input: {flex: 1, color: colors.text, fontSize: 14, padding: 0},
  clear: {color: colors.muted, fontSize: 12},
  pillScroll: {flexGrow: 0},
  pills: {gap: 6, paddingTop: 10, paddingBottom: 10},
  pill: {height: 30, paddingHorizontal: 13, borderRadius: 15, backgroundColor: colors.surface2, justifyContent: 'center'},
  pillText: {color: '#C9C5D8', fontSize: 13, fontWeight: '500'},
  list: {flex: 1},
  empty: {color: colors.muted, fontSize: 13, paddingVertical: 16, paddingHorizontal: 8},
  row: {height: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 8, paddingRight: 4, borderRadius: 12, marginBottom: 4},
  rowHeart: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  rowName: {color: colors.text, fontSize: 14, fontWeight: '700'},
  rowSub: {color: colors.muted, fontSize: 12},
  sleepWrap: {position: 'absolute', left: 12, right: 12, bottom: 56},
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
