import React, {useEffect, useMemo} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';

type Props = {
  count: number;
  barWidth: number;
  height: number;
  color: string;
  active: boolean;
  gap?: number; // verilmezse çubuklar genişliğe yayılır
};

// Ses dalgası animasyonu. Yayından gerçek ses analizi alınmaz; durum
// (çalıyor/duraklatıldı) ile hareket eder, tasarımdaki gibi.
export default function Waveform({
  count,
  barWidth,
  height,
  color,
  active,
  gap,
}: Props) {
  const bars = useMemo(
    () =>
      Array.from({length: count}, (_, i) => ({
        base: (26 + ((i * 53) % 74)) / 100,
        duration: 900 + ((i * 7) % 5) * 190,
        delay: (i * 130) % 1300,
        value: new Animated.Value(0.18),
      })),
    [count],
  );

  useEffect(() => {
    const loops = bars.map(b => {
      if (!active) {
        Animated.timing(b.value, {
          toValue: 0.18,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
        return null;
      }
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(b.value, {
            toValue: 1,
            duration: b.duration / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(b.value, {
            toValue: 0.18,
            duration: b.duration / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      const t = setTimeout(() => loop.start(), b.delay);
      return () => {
        clearTimeout(t);
        loop.stop();
      };
    });
    return () => loops.forEach(stop => stop && stop());
  }, [bars, active]);

  return (
    <View
      style={[
        styles.row,
        {height},
        gap === undefined
          ? {justifyContent: 'space-between'}
          : {justifyContent: 'center', gap},
      ]}>
      {bars.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            width: barWidth,
            height: height * b.base,
            borderRadius: barWidth / 2,
            backgroundColor: color,
            transform: [{scaleY: b.value}],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center'},
});
