import React, {useState} from 'react';
import {
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
import {colors} from '../theme';
import Badge from './Badge';
import {FONT_DISPLAY, VolumeBar} from './Common';
import {
  HeartIcon,
  MenuIcon,
  MoonIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  SearchIcon,
  SlidersIcon,
  VolumeIcon,
} from './Icons';
import Marquee from './Marquee';
import SleepSheet from './SleepSheet';
import StationsScreen from './StationsScreen';
import Waveform from './Waveform';

// Mac adası (genişlemiş): tasarımdaki "kart" ve "liste" halleri.
// Kart: radyo kutusu + canlı etiketi + ad + kayan şarkı, kart genişliğinde dalga, kontroller, hızlı radyolar.
// Liste (tall): aynı kartın altında arama, kategoriler, radyo listesi ve alt çubuk.
export default function MacIsland({
  tall,
  onToggleList,
}: {
  tall: boolean;
  onToggleList: () => void;
}) {
  const p = usePlayer();
  const [cat, setCat] = useState(ALL);
  const [query, setQuery] = useState('');
  const [settings, setSettings] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const st = p.current ?? p.stations[0];
  if (!st) {
    return null;
  }

  const live = p.status === 'playing' || p.status === 'buffering';
  const fav = p.isFavorite(st.id);
  const song = [p.meta?.artist, p.meta?.title].filter(Boolean).join(' — ');
  const line =
    p.status === 'error'
      ? p.error ?? 'Yayın açılamadı'
      : p.status === 'buffering'
      ? 'Bağlanıyor…'
      : song || 'Canlı yayın';

  // Hızlı radyolar: çalan radyo başta, sonra favoriler / ilk radyolar (en çok 5)
  const chips = [st, ...p.quick.filter(s => s.id !== st.id)].slice(0, 5);

  const cats = [
    {id: ALL, name: 'Tümü'},
    {id: FAVORITES, name: `Favoriler${p.favorites.length ? ` · ${p.favorites.length}` : ''}`},
    ...Array.from(new Map(p.stations.map(s => [s.categoryId, s.categoryName])).entries()).map(
      ([id, name]) => ({id, name}),
    ),
  ];
  const rows = filterStations(p.stations, {category: cat, query, favorites: p.favorites});

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.top}>
          <Badge station={st} active size={64} />
          <View style={styles.titleCol}>
            <View style={styles.liveRow}>
              <View style={[styles.dot, {backgroundColor: st.color, opacity: live ? 1 : 0.4}]} />
              <Text style={[styles.live, {color: st.color}]}>CANLI</Text>
              <Text style={styles.cat}>· {st.categoryName}</Text>
            </View>
            <Text numberOfLines={1} style={[styles.name, FONT_DISPLAY]}>
              {st.name}
            </Text>
            <Marquee text={line} style={styles.song} />
          </View>
          <Pressable
            accessibilityLabel={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            onPress={() => p.toggleFavorite(st.id)}
            style={styles.heart}>
            <HeartIcon size={22} color={fav ? st.color : colors.text} filled={fav} />
          </Pressable>
        </View>

        <Waveform
          count={52}
          barWidth={3}
          height={26}
          color={st.color}
          active={p.status === 'playing'}
        />

        <View style={styles.controls}>
          <View style={styles.volume}>
            <VolumeIcon size={18} color={colors.muted} />
            <VolumeBar value={p.volume} color={colors.text} onChange={p.setVolume} />
          </View>
          <View style={styles.transport}>
            <Pressable accessibilityLabel="Önceki radyo" onPress={p.prev} style={styles.skip}>
              <PrevIcon size={24} color="#FFFFFF" />
            </Pressable>
            <Pressable
              accessibilityLabel={live ? 'Duraklat' : 'Oynat'}
              onPress={p.toggle}
              style={[styles.play, {backgroundColor: st.color}]}>
              {live ? <PauseIcon size={22} color={st.ink} /> : <PlayIcon size={22} color={st.ink} />}
            </Pressable>
            <Pressable accessibilityLabel="Sonraki radyo" onPress={p.next} style={styles.skip}>
              <NextIcon size={24} color="#FFFFFF" />
            </Pressable>
          </View>
          <View style={styles.listBtnWrap}>
            <Pressable
              accessibilityLabel={tall ? 'Listeyi kapat' : 'Tüm radyolar ve arama'}
              onPress={onToggleList}
              style={[styles.listBtn, tall && {backgroundColor: colors.text}]}>
              {tall ? (
                <Text style={styles.listBtnUp}>⌃</Text>
              ) : (
                <MenuIcon size={18} color={colors.text} />
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.chips}>
          {chips.map(s => {
            const active = s.id === st.id;
            return (
              <Pressable
                key={s.id}
                accessibilityLabel={s.name}
                onPress={() => p.select(s)}
                onLongPress={() => p.pickColor(s.id)}
                style={[styles.chip, active && styles.chipOn]}>
                <Badge station={s} active={active} size={34} circle />
              </Pressable>
            );
          })}
        </View>
      </View>

      {tall && (
        <View style={styles.listArea}>
          <View style={styles.divider} />
          {settings ? (
            <View style={{flex: 1, marginHorizontal: -20}}>
              <StationsScreen onBack={() => setSettings(false)} />
            </View>
          ) : (
            <>
              <View style={styles.search}>
                <SearchIcon size={16} color={colors.muted} />
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
                      onLongPress={() => p.pickColor(s.id)}
                      style={[styles.row, active && {backgroundColor: colors.surface}]}>
                      <Badge station={s} active={active} />
                      <View style={{flex: 1}}>
                        <Text style={styles.rowName}>{s.name}</Text>
                        <Text numberOfLines={1} style={styles.rowSub}>{s.categoryName}</Text>
                      </View>
                      {active && live && (
                        <Waveform count={4} barWidth={3} height={14} gap={2} color={s.color} active={p.status === 'playing'} />
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
                <Pressable onPress={() => NativeModules.FrekansAudio?.quit()} style={styles.footBtn}>
                  <Text style={styles.footText}>Çık</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {sleepOpen && tall && (
        <View style={styles.sleepWrap}>
          <SleepSheet color={st.color} ink={st.ink} onClose={() => setSleepOpen(false)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12},
  card: {gap: 12},
  top: {flexDirection: 'row', alignItems: 'center', gap: 14, height: 64},
  titleCol: {flex: 1, minWidth: 0, gap: 3},
  liveRow: {flexDirection: 'row', alignItems: 'center', gap: 7},
  dot: {width: 7, height: 7, borderRadius: 4},
  live: {fontSize: 10, fontWeight: '700', letterSpacing: 1.4},
  cat: {color: colors.muted, fontSize: 10, fontWeight: '500'},
  name: {color: '#FFFFFF', fontSize: 26, lineHeight: 26},
  song: {color: colors.muted, fontSize: 13},
  heart: {width: 32, height: 40, alignItems: 'center', justifyContent: 'center'},
  controls: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40},
  volume: {width: 92, flexDirection: 'row', alignItems: 'center', gap: 8},
  transport: {flexDirection: 'row', alignItems: 'center', gap: 18},
  skip: {width: 32, height: 40, alignItems: 'center', justifyContent: 'center'},
  play: {width: 60, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  listBtnWrap: {width: 92, alignItems: 'flex-end'},
  listBtn: {width: 36, height: 30, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center'},
  listBtnUp: {color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 2},
  chips: {flexDirection: 'row', justifyContent: 'center', gap: 14, height: 34},
  chip: {width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: -2},
  chipOn: {borderColor: colors.text},
  listArea: {flex: 1, gap: 10, paddingTop: 2},
  divider: {height: 1, backgroundColor: colors.line, marginTop: 2},
  search: {height: 38, borderRadius: 12, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12},
  input: {flex: 1, color: colors.text, fontSize: 14, padding: 0},
  clear: {color: colors.muted, fontSize: 12},
  pillScroll: {flexGrow: 0},
  pills: {gap: 6},
  pill: {height: 30, paddingHorizontal: 13, borderRadius: 15, backgroundColor: colors.surface, justifyContent: 'center'},
  pillText: {color: '#C9C5D8', fontSize: 13, fontWeight: '500'},
  list: {flex: 1},
  empty: {color: colors.muted, fontSize: 13, paddingVertical: 16, paddingHorizontal: 8},
  row: {height: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 8, paddingRight: 4, borderRadius: 12, marginBottom: 2},
  rowHeart: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  rowName: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
  rowSub: {color: colors.muted, fontSize: 12},
  footer: {paddingTop: 8, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', justifyContent: 'space-between'},
  footBtn: {flexDirection: 'row', alignItems: 'center', gap: 8},
  footText: {color: colors.muted, fontSize: 13},
  sleepWrap: {position: 'absolute', left: 12, right: 12, bottom: 44},
});
