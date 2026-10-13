import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {usePlayer} from '../PlayerContext';
import {colors} from '../theme';
import Badge from './Badge';
import {HeartIcon} from './Icons';
import Waveform from './Waveform';

// Aşağıdan yukarı kayan radyo listesi. Favori varsa "Favoriler", yoksa "Tümü" ile açılır;
// üstteki seçiciyle ikisi arasında geçilebilir. Aşağı çekerek ya da boşluğa dokunarak kapanır.
export default function RadioSheet({open, onClose}: {open: boolean; onClose: () => void}) {
  const p = usePlayer();
  const insets = useSafeAreaInsets();
  const {height} = useWindowDimensions();
  const sheetH = Math.round(height * 0.68);
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<'fav' | 'all'>('all');

  const favList = useMemo(
    () => p.stations.filter(s => p.favorites.includes(s.id)),
    [p.stations, p.favorites],
  );

  useEffect(() => {
    if (open) {
      setTab(favList.length > 0 ? 'fav' : 'all');
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6,
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) {
          progress.setValue(Math.max(0, 1 - g.dy / sheetH));
        }
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 80 || g.vy > 0.8) {
          closeRef.current();
        } else {
          Animated.timing(progress, {toValue: 1, duration: 160, useNativeDriver: true}).start();
        }
      },
    }),
  ).current;

  if (!mounted) {
    return null;
  }
  const list = tab === 'fav' && favList.length > 0 ? favList : p.stations;
  const st = p.current;
  const live = p.status === 'playing' || p.status === 'buffering';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, {backgroundColor: '#000', opacity: progress.interpolate({inputRange: [0, 1], outputRange: [0, 0.5]})}]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Listeyi kapat" />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetH,
            paddingBottom: Math.max(insets.bottom, 8),
            transform: [{translateY: progress.interpolate({inputRange: [0, 1], outputRange: [sheetH, 0]})}],
          },
        ]}>
        <View {...pan.panHandlers} style={styles.grab}>
          <View style={styles.handle} />
          <View style={styles.seg}>
            <Pressable onPress={() => setTab('fav')} style={[styles.segItem, tab === 'fav' && styles.segOn]}>
              <HeartIcon size={14} color={tab === 'fav' ? colors.ink : colors.muted} filled={tab === 'fav'} />
              <Text style={[styles.segText, tab === 'fav' && styles.segTextOn]}>
                Favoriler{favList.length ? ` · ${favList.length}` : ''}
              </Text>
            </Pressable>
            <Pressable onPress={() => setTab('all')} style={[styles.segItem, tab === 'all' && styles.segOn]}>
              <Text style={[styles.segText, tab === 'all' && styles.segTextOn]}>
                Tümü · {p.stations.length}
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {tab === 'fav' && favList.length === 0 && (
            <Text style={styles.empty}>Henüz favori yok. Radyonun yanındaki kalbe dokun.</Text>
          )}
          {list.map(s => {
            const active = st?.id === s.id;
            const isFav = p.isFavorite(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  p.select(s);
                  onClose();
                }}
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
          <Text style={styles.hint}>Rengi değiştirmek için radyoya basılı tut</Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 12,
  },
  grab: {alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 10},
  handle: {width: 40, height: 5, borderRadius: 3, backgroundColor: colors.surface3},
  seg: {flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: colors.surface2},
  segItem: {height: 32, paddingHorizontal: 14, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 6},
  segOn: {backgroundColor: colors.text},
  segText: {color: colors.muted, fontSize: 13, fontWeight: '700'},
  segTextOn: {color: colors.ink},
  empty: {color: colors.muted, fontSize: 13, padding: 16},
  row: {height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 8, paddingRight: 4, borderRadius: 14},
  rowName: {color: colors.text, fontSize: 15, fontWeight: '700'},
  rowSub: {color: colors.muted, fontSize: 12},
  rowHeart: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  hint: {color: colors.muted, fontSize: 11, textAlign: 'center', paddingVertical: 12, opacity: 0.8},
});
