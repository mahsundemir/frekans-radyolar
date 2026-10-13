import React, {useMemo, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {filterStations, FAVORITES, norm} from '../filter';
import {usePlayer} from '../PlayerContext';
import {useShot} from '../shotHarness';
import {colors} from '../theme';
import {FONT_DISPLAY, Toggle} from './Common';
import Badge from './Badge';
import Waveform from './Waveform';
import {ChevronLeft, HeartIcon, RefreshIcon, SearchIcon} from './Icons';

// Ayarlar › Radyolar: Dil > Kategori > Radyolar (stations.json'dan)
export default function StationsScreen({onBack}: {onBack: () => void}) {
  const p = usePlayer();
  const [lang, setLang] = useState(p.file.languages[0]?.code ?? 'tr');
  const [query, setQuery] = useState('');
  const shot = useShot();
  const scrollRef = React.useRef<ScrollView>(null);
  React.useEffect(() => { setQuery(shot.query ?? ''); }, [shot.query]);
  React.useEffect(() => { scrollRef.current?.scrollTo({y: shot.scroll ?? 0, animated: false}); }, [shot.scroll]);
  const language = p.file.languages.find(l => l.code === lang) ?? p.file.languages[0];
  const q = norm(query.trim());
  const live = p.status === 'playing' || p.status === 'buffering';

  const groups = useMemo(
    () =>
      (language?.categories ?? [])
        .map(c => ({
          ...c,
          stations: c.stations.filter(
            s => !q || norm(s.name).includes(q),
          ),
        }))
        .filter(c => c.stations.length > 0),
    [language, q],
  );

  const favs = filterStations(
    p.all.filter(s => s.languageCode === language?.code),
    {category: FAVORITES, query, favorites: p.favorites},
  );

  return (
    <View style={styles.root}>
      <View style={styles.nav}>
        <Pressable onPress={onBack} style={styles.back} accessibilityLabel="Geri">
          <ChevronLeft color={colors.muted} />
          <Text style={styles.backText}>Geri</Text>
        </Pressable>
      </View>

      <View style={styles.titleRow}>
        <Text style={[styles.title, FONT_DISPLAY]}>Radyolar</Text>
        <View style={styles.seg}>
          {p.file.languages.map(l => (
            <Pressable
              key={l.code}
              onPress={() => setLang(l.code)}
              style={[styles.segItem, l.code === lang && styles.segOn]}>
              <Text style={[styles.segText, l.code === lang && styles.segTextOn]}>
                {l.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.searchRow}>
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
        </View>
        <Pressable
          accessibilityLabel="Radyo listesini yenile"
          onPress={p.refresh}
          style={styles.refresh}>
          <RefreshIcon color={p.refreshing ? colors.muted : colors.text} />
          <Text style={styles.refreshText}>v{p.file.version}</Text>
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.list}>
        {favs.length > 0 && (
          <View>
            <View style={styles.groupHead}>
              <HeartIcon size={14} color={colors.text} filled />
              <Text style={styles.groupName}>FAVORİLER</Text>
              <Text style={styles.groupCount}>· {favs.length}</Text>
            </View>
            <View style={styles.card}>
              {favs.map((s, i) => (
                <View key={s.id}>
                  {i > 0 && <View style={styles.sep} />}
                  <View style={styles.row}>
                    <Pressable style={styles.rowMain} onPress={() => p.select(s)}>
                      <Badge station={s} active={p.current?.id === s.id} />
                      <Text style={styles.rowName}>{s.name}</Text>
                      {p.current?.id === s.id && live && (
                        <Waveform count={3} barWidth={3} height={14} gap={2} color={s.color} active={p.status === 'playing'} />
                      )}
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`${s.name} favorilerden çıkar`}
                      onPress={() => p.toggleFavorite(s.id)}
                      style={styles.heartBtn}>
                      <HeartIcon size={20} color={s.color} filled />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        {groups.map(c => (
          <View key={c.id}>
            <View style={styles.groupHead}>
              <View style={[styles.groupDot, {backgroundColor: c.color}]} />
              <Text style={styles.groupName}>{c.name.toLocaleUpperCase('tr')}</Text>
              <Text style={styles.groupCount}>· {c.stations.length}</Text>
            </View>
            <View style={styles.card}>
              {c.stations.map((s, i) => {
                const flat = p.all.find(a => a.id === s.id);
                const on = p.enabled[s.id] !== false;
                return (
                  <View key={s.id}>
                    {i > 0 && <View style={styles.sep} />}
                    <View style={styles.row}>
                      <Pressable
                        style={styles.rowMain}
                        onPress={() => flat && p.select(flat)}>
                        {flat && <Badge station={flat} active={p.current?.id === s.id} />}
                        <Text style={styles.rowName}>{s.name}</Text>
                        {p.current?.id === s.id && live && (
                          <Waveform count={3} barWidth={3} height={14} gap={2} color={c.color} active={p.status === 'playing'} />
                        )}
                      </Pressable>
                      <Pressable
                        accessibilityLabel={
                          p.isFavorite(s.id)
                            ? `${s.name} favorilerden çıkar`
                            : `${s.name} favorilere ekle`
                        }
                        onPress={() => p.toggleFavorite(s.id)}
                        style={styles.heartBtn}>
                        <HeartIcon
                          size={20}
                          color={p.isFavorite(s.id) ? c.color : colors.muted}
                          filled={p.isFavorite(s.id)}
                        />
                      </Pressable>
                      <Toggle
                        on={on}
                        color={c.color}
                        label={s.name}
                        onChange={v => p.setEnabled(s.id, v)}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20},
  nav: {height: 44, justifyContent: 'center'},
  back: {flexDirection: 'row', alignItems: 'center', gap: 2},
  backText: {color: colors.muted, fontSize: 16},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  title: {color: colors.text, fontSize: 38},
  seg: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    backgroundColor: colors.surface2,
  },
  segItem: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segOn: {backgroundColor: colors.text},
  segText: {color: colors.muted, fontSize: 14, fontWeight: '700'},
  segTextOn: {color: colors.ink},
  searchRow: {flexDirection: 'row', gap: 10, marginTop: 14},
  search: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  input: {flex: 1, color: colors.text, fontSize: 15, padding: 0},
  refresh: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshText: {color: colors.muted, fontSize: 13},
  saverRow: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saverTitle: {color: colors.text, fontSize: 14, fontWeight: '700'},
  saverSub: {color: colors.muted, fontSize: 12, marginTop: 2},
  list: {paddingVertical: 12, gap: 12},
  groupHead: {flexDirection: 'row', alignItems: 'center', gap: 8, height: 28},
  groupDot: {width: 8, height: 8, borderRadius: 4},
  groupName: {color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.4},
  groupCount: {color: colors.muted, fontSize: 12},
  card: {borderRadius: 16, backgroundColor: colors.surface, overflow: 'hidden'},
  sep: {height: 1, backgroundColor: colors.line, marginLeft: 62},
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  heartBtn: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  rowMain: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12},
  rowName: {color: colors.text, fontSize: 15, fontWeight: '700', flex: 1},
});
