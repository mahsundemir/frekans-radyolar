import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {usePlayer} from '../PlayerContext';
import {colors} from '../theme';

const OPTIONS = [15, 30, 45, 60, 90];

export function remainingText(sleepEnd: number | null, now: number): string {
  if (!sleepEnd) {
    return '';
  }
  const mins = Math.max(0, Math.ceil((sleepEnd - now) / 60000));
  return mins <= 1 ? '1 dk' : `${mins} dk`;
}

// Çalan radyonun renginde seçili süre; seçince kapanır
export default function SleepSheet({
  color,
  ink,
  onClose,
}: {
  color: string;
  ink: string;
  onClose: () => void;
}) {
  const p = usePlayer();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Uyku zamanlayıcı</Text>
        <Text style={styles.sub}>
          {p.sleepEnd
            ? `${remainingText(p.sleepEnd, now)} sonra duracak`
            : 'Süre dolunca ses kısılır ve yayın durur'}
        </Text>
      </View>
      <View style={styles.row}>
        {OPTIONS.map(m => (
          <Pressable
            key={m}
            accessibilityLabel={`${m} dakika`}
            onPress={() => {
              p.setSleep(m);
              onClose();
            }}
            style={[styles.chip, {backgroundColor: color}]}>
            <Text style={[styles.chipText, {color: ink}]}>{m} dk</Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityLabel="Zamanlayıcıyı kapat"
          onPress={() => {
            p.setSleep(0);
            onClose();
          }}
          style={[styles.chip, styles.off]}>
          <Text style={[styles.chipText, {color: colors.text}]}>Kapat</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: colors.surface2,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  head: {gap: 2},
  title: {color: colors.text, fontSize: 16, fontWeight: '800'},
  sub: {color: colors.muted, fontSize: 13},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: {backgroundColor: colors.surface3},
  chipText: {fontSize: 14, fontWeight: '700'},
});
