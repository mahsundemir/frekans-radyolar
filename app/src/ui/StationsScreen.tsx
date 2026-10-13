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
import {localeOf} from '../i18n';
import {usePlayer} from '../PlayerContext';
import {colors} from '../theme';
import {FONT_DISPLAY, Toggle} from './Common';
import Badge from './Badge';
import Waveform from './Waveform';
import {CheckIcon, ChevronDown, ChevronLeft, HeartIcon, RefreshIcon, SearchIcon} from './Icons';

// Ayarlar › Radyolar: Dil > Kategori > Radyolar (stations.json'dan)
export default function StationsScreen({onBack}: {onBack: () => void}) {
  const p = usePlayer();
  const [query, setQuery] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  // Yayın dili global tercih: radyolar ve uygulama dili buna göre değişir
  const language = p.file.languages.find(l => l.code === p.language) ?? p.file.languages[0];
  const countOf = (code: string) => p.all.filter(s => s.languageCode === code).length;
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
        <Pressable onPress={onBack} style={styles.back} accessibilityLabel={p.t('back')}>
          <ChevronLeft color={colors.muted} />
          <Text style={styles.backText}>{p.t('back')}</Text>
        </Pressable>
      </View>

      <View style={styles.titleRow}>
        <Text style={[styles.title, FONT_DISPLAY]}>{p.t('radios')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${p.t('broadcastLanguage')}: ${language?.name ?? ''}`}
          onPress={() => setLangOpen(o => !o)}
          style={styles.langBtn}>
          <Text numberOfLines={1} style={styles.langBtnText}>{language?.name}</Text>
          <ChevronDown size={18} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.search}>
          <SearchIcon color={colors.muted} />
          <TextInput
            {...({enableFocusRing: false} as object)}
            value={query}
            onChangeText={setQuery}
            placeholder={p.t('searchRadio')}
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>
        <Pressable
          accessibilityLabel={p.t('refreshList')}
          onPress={p.refresh}
          style={styles.refresh}>
          <RefreshIcon color={p.refreshing ? colors.muted : colors.text} />
          <Text style={styles.refreshText}>v{p.file.version}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {favs.length > 0 && (
          <View>
            <View style={styles.groupHead}>
              <HeartIcon size={14} color={colors.text} filled />
              <Text style={styles.groupName}>{p.t('favoritesCaps')}</Text>
              <Text style={styles.groupCount}>· {favs.length}</Text>
            </View>
            <View style={styles.card}>
              {favs.map((s, i) => (
                <View key={s.id}>
                  {i > 0 && <View style={styles.sep} />}
                  <View style={styles.row}>
                    <Pressable style={styles.rowMain} onPress={() => p.select(s)} onLongPress={() => p.pickColor(s.id)}>
                      <Badge station={s} active={p.current?.id === s.id} />
                      <Text style={styles.rowName}>{s.name}</Text>
                      {p.current?.id === s.id && live && (
                        <Waveform count={3} barWidth={3} height={14} gap={2} color={s.color} active={p.status === 'playing'} />
                      )}
                    </Pressable>
                    <Pressable
                      accessibilityLabel={p.t('favRemoveNamed', {name: s.name})}
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
              <Text style={styles.groupName}>{c.name.toLocaleUpperCase(localeOf(p.language))}</Text>
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
                        onPress={() => flat && p.select(flat)}
                        onLongPress={() => p.pickColor(s.id)}>
                        {flat && <Badge station={flat} active={p.current?.id === s.id} />}
                        <Text style={styles.rowName}>{s.name}</Text>
                        {p.current?.id === s.id && live && (
                          <Waveform count={3} barWidth={3} height={14} gap={2} color={c.color} active={p.status === 'playing'} />
                        )}
                      </Pressable>
                      <Pressable
                        accessibilityLabel={
                          p.isFavorite(s.id)
                            ? p.t('favRemoveNamed', {name: s.name})
                            : p.t('favAddNamed', {name: s.name})
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

      {langOpen && (
        <View style={styles.langLayer} pointerEvents="box-none">
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setLangOpen(false)}
            accessibilityLabel={p.t('close')}
          />
          <View style={styles.langMenu}>
            <Text style={styles.langHead}>{p.t('broadcastLanguage').toLocaleUpperCase(localeOf(p.language))}</Text>
            <Text style={styles.langHint}>{p.t('languageHint')}</Text>
            <ScrollView style={{maxHeight: 360}} showsVerticalScrollIndicator={false}>
              {p.file.languages.map((l, i) => {
                const on = l.code === language?.code;
                return (
                  <Pressable
                    key={l.code}
                    accessibilityRole="button"
                    accessibilityState={{selected: on}}
                    onPress={() => {
                      p.setLanguage(l.code);
                      setQuery('');
                      setLangOpen(false);
                    }}
                    style={[styles.langRow, i > 0 && styles.langRowSep]}>
                    <View style={{flex: 1}}>
                      <Text style={[styles.langName, on && {color: colors.text}]}>{l.name}</Text>
                      <Text style={styles.langCount}>{p.t('stationCount', {n: countOf(l.code)})}</Text>
                    </View>
                    {on && <CheckIcon color={colors.text} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}
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
  langBtn: {
    height: 36,
    maxWidth: 170,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 12,
    backgroundColor: colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langBtnText: {color: colors.ink, fontSize: 14, fontWeight: '700', flexShrink: 1},
  langLayer: {...StyleSheet.absoluteFillObject, zIndex: 20},
  langMenu: {
    position: 'absolute',
    top: 96,
    right: 20,
    width: 260,
    borderRadius: 18,
    backgroundColor: colors.surface3,
    paddingTop: 14,
    paddingHorizontal: 6,
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 10},
  },
  langHead: {color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.4, paddingHorizontal: 10},
  langHint: {color: colors.muted, fontSize: 12, paddingHorizontal: 10, paddingTop: 4, paddingBottom: 8, opacity: 0.85},
  langRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, gap: 8},
  langRowSep: {borderTopWidth: 1, borderTopColor: colors.line},
  langName: {color: colors.muted, fontSize: 16, fontWeight: '700'},
  langCount: {color: colors.muted, fontSize: 12, marginTop: 1},
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
