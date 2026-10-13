import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {usePlayer} from '../PlayerContext';
import {colors} from '../theme';

const OPTIONS = [15, 30, 45, 60, 90];

export function remainingText(
  sleepEnd: number | null,
  now: number,
  fmt: (mins: number) => string = m => `${m} dk`,
): string {
  if (!sleepEnd) {
    return '';
  }
  const mins = Math.max(0, Math.ceil((sleepEnd - now) / 60000));
  return fmt(Math.max(1, mins));
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
        <Text style={styles.title}>{p.t('sleepTimer')}</Text>
        <Text style={styles.sub}>
          {p.sleepEnd
            ? p.t('sleepRemaining', {
                time: remainingText(p.sleepEnd, now, n => p.t('minutesShort', {n})),
              })
            : p.t('sleepHint')}
        </Text>
      </View>
      <View style={styles.row}>
        {OPTIONS.map(m => (
          <Pressable
            key={m}
            accessibilityLabel={p.t('minutesLabel', {n: m})}
            onPress={() => {
              p.setSleep(m);
              onClose();
            }}
            style={[styles.chip, {backgroundColor: color}]}>
            <Text style={[styles.chipText, {color: ink}]}>{p.t('minutesShort', {n: m})}</Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityLabel={p.t('turnOffTimer')}
          onPress={() => {
            p.setSleep(0);
            onClose();
          }}
          style={[styles.chip, styles.off]}>
          <Text style={[styles.chipText, {color: colors.text}]}>{p.t('off')}</Text>
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
