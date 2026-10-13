import React, {useEffect, useMemo, useState} from 'react';
import {Animated, Easing, Platform, StyleSheet, View} from 'react-native';
import {usePlayer} from '../PlayerContext';

type Props = {
  count: number;
  barWidth: number;
  height: number;
  color: string;
  active: boolean;
  gap?: number; // verilmezse çubuklar genişliğe yayılır
};

const MIN = 0.18;

// Ses dalgası animasyonu. Yayından gerçek ses analizi alınmaz; durum (çalıyor/duraklatıldı) ile
// hareket eder. Pil tasarrufu açıkken düz kalır.
//  - iOS: native sürücülü scaleY animasyonu (ana iş parçacığını yormaz).
//  - macOS: native sürücülü transform güvenilir değil. Tek bir zamanlayıcı saniyede ~9 kez
//    tüm çubukları günceller (çubuk başına 60 kare/sn JS animasyonuna göre çok daha az enerji).
export default function Waveform(props: Props) {
  const {saver} = usePlayer();
  const active = props.active && !saver;
  return Platform.OS === 'macos' ? (
    <TimerWave {...props} active={active} />
  ) : (
    <NativeWave {...props} active={active} />
  );
}

function layoutStyle(gap?: number) {
  return gap === undefined
    ? {justifyContent: 'space-between' as const}
    : {justifyContent: 'center' as const, gap};
}

function useBars(count: number) {
  return useMemo(
    () =>
      Array.from({length: count}, (_, i) => ({
        base: (26 + ((i * 53) % 74)) / 100,
        duration: 900 + ((i * 7) % 5) * 190,
        delay: (i * 130) % 1300,
        speed: 0.8 + ((i * 7) % 5) * 0.25,
        offset: i * 0.9,
        value: new Animated.Value(MIN),
      })),
    [count],
  );
}

function NativeWave({count, barWidth, height, color, active, gap}: Props) {
  const bars = useBars(count);

  useEffect(() => {
    const stops = bars.map(b => {
      if (!active) {
        Animated.timing(b.value, {
          toValue: MIN,
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
            toValue: MIN,
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
    return () => stops.forEach(stop => stop && stop());
  }, [bars, active]);

  return (
    <View style={[styles.row, {height}, layoutStyle(gap)]}>
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

function TimerWave({count, barWidth, height, color, active, gap}: Props) {
  const bars = useBars(count);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) {
      setTick(0);
      return;
    }
    const id = setInterval(() => setTick(v => v + 1), 110);
    return () => clearInterval(id);
  }, [active]);

  return (
    <View style={[styles.row, {height}, layoutStyle(gap)]}>
      {bars.map((b, i) => {
        const k = active ? MIN + (1 - MIN) * (0.5 + 0.5 * Math.sin(tick * 0.35 * b.speed + b.offset)) : MIN;
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: Math.max(barWidth, height * b.base * k),
              borderRadius: barWidth / 2,
              backgroundColor: color,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center'},
});
