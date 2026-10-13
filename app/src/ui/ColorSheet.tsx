import React from 'react';
import {Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {usePlayer} from '../PlayerContext';
import {colors} from '../theme';
import Badge from './Badge';

export const PALETTE = [
  '#FF5B4A',
  '#FF8A3D',
  '#FFB020',
  '#C8F560',
  '#4ADE80',
  '#2DD4A8',
  '#34C8FF',
  '#6A47FF',
  '#E040FB',
  '#FF6FB5',
];

// Radyo rengi seçici. Radyoya basılı tutunca ya da favoriye eklerken açılır.
// Seçilen renk radyonun her yerinde (liste, oynatıcı, ada, canlı etkinlik) kullanılır.
export default function ColorSheet() {
  const p = usePlayer();
  const target = p.colorTarget;
  const station = target ? p.all.find(s => s.id === target.id) : null;
  if (!target || !station) {
    return null;
  }
  const custom = p.colorOf[station.id];

  return (
    <View style={styles.fill} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={p.closeColorPicker} accessibilityLabel="Kapat" />
      <View style={styles.card}>
        <View style={styles.head}>
          <Badge station={station} active size={44} />
          <View style={{flex: 1}}>
            <Text style={styles.title}>
              {target.fresh ? 'Favorilere eklendi' : 'Radyo rengi'}
            </Text>
            <Text numberOfLines={1} style={styles.sub}>
              {station.name} için bir renk seç
            </Text>
          </View>
        </View>
        <View style={styles.swatches}>
          {PALETTE.map(c => {
            const selected = station.color.toLowerCase() === c.toLowerCase();
            return (
              <Pressable
                key={c}
                accessibilityLabel={`Renk ${c}`}
                onPress={() => p.setStationColor(station.id, c)}
                style={[
                  styles.swatch,
                  Platform.OS === 'macos' && styles.swatchMac,
                  {backgroundColor: c},
                  selected && styles.swatchOn,
                ]}
              />
            );
          })}
        </View>
        <View style={styles.actions}>
          {custom ? (
            <Pressable
              onPress={() => p.setStationColor(station.id, null)}
              style={[styles.btn, styles.btnGhost]}>
              <Text style={[styles.btnText, {color: colors.text}]}>Varsayılana dön</Text>
            </Pressable>
          ) : (
            <View style={{flex: 1}} />
          )}
          <Pressable onPress={p.closeColorPicker} style={[styles.btn, {backgroundColor: station.color}]}>
            <Text style={[styles.btnText, {color: station.ink}]}>
              {target.fresh && !custom ? 'Atla' : 'Tamam'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {...StyleSheet.absoluteFillObject, justifyContent: 'flex-end'},
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)'},
  card: {
    margin: 12,
    padding: Platform.OS === 'macos' ? 14 : 16,
    borderRadius: 22,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    gap: Platform.OS === 'macos' ? 12 : 16,
  },
  head: {flexDirection: 'row', alignItems: 'center', gap: 12},
  title: {color: colors.text, fontSize: 16, fontWeight: '800'},
  sub: {color: colors.muted, fontSize: 13, marginTop: 2},
  swatches: {flexDirection: 'row', flexWrap: 'wrap', gap: Platform.OS === 'macos' ? 6 : 12},
  swatch: {width: 40, height: 40, borderRadius: 20},
  swatchMac: {width: 28, height: 28, borderRadius: 14},
  swatchOn: {borderWidth: 3, borderColor: colors.text},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 10},
  btn: {height: 40, paddingHorizontal: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  btnGhost: {backgroundColor: colors.surface3},
  btnText: {fontSize: 14, fontWeight: '700'},
});
