import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  Text,
  View,
} from 'react-native';
import {colors} from '../theme';

// Başlık yazı tipi: Bricolage Grotesque ExtraBold (assets/fonts, her iki uygulamaya gömülü)
export const FONT_DISPLAY = {fontFamily: 'BricolageGrotesque-ExtraBold', letterSpacing: -1};

// Yeni renge 500 ms'de geçen animasyonlu renk
export function useColorTransition(target: string) {
  const progress = useRef(new Animated.Value(1)).current;
  const [pair, setPair] = useState({from: target, to: target});
  useEffect(() => {
    if (pair.to === target) {
      return;
    }
    setPair({from: pair.to, to: target});
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return progress.interpolate({
    inputRange: [0, 1],
    outputRange: [pair.from, pair.to],
  });
}

export function Mono({
  text,
  color,
  ink,
  size = 36,
}: {
  text: string;
  color: string;
  ink: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text
        style={{
          color: ink,
          fontSize: size * 0.36,
          fontWeight: '800',
          letterSpacing: -0.3,
        }}>
        {text}
      </Text>
    </View>
  );
}

export function Toggle({
  on,
  color,
  onChange,
  label,
}: {
  on: boolean;
  color: string;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{checked: on}}
      onPress={() => onChange(!on)}
      style={{
        width: 46,
        height: 28,
        borderRadius: 14,
        backgroundColor: on ? color : colors.surface3,
        padding: 3,
        alignItems: on ? 'flex-end' : 'flex-start',
      }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: on ? colors.white : colors.muted,
        }}
      />
    </Pressable>
  );
}

export function VolumeBar({
  value,
  color,
  onChange,
}: {
  value: number;
  color: string;
  onChange: (v: number) => void;
}) {
  const [w, setW] = useState(1);
  const start = useRef(0);
  const live = useRef({w: 1, value, onChange});
  live.current = {w, value, onChange};
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => {
        const v = clamp(e.nativeEvent.locationX / live.current.w);
        start.current = v;
        live.current.onChange(v);
      },
      onPanResponderMove: (_e, g) => {
        live.current.onChange(clamp(start.current + g.dx / live.current.w));
      },
    }),
  ).current;
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Ses"
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
      style={{flex: 1, height: 28, justifyContent: 'center'}}>
      <View
        pointerEvents="none"
        style={{height: 4, borderRadius: 2, backgroundColor: colors.surface3}}>
        <View
          style={{
            width: `${value * 100}%`,
            height: 4,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: `${value * 100}%`,
            top: -5,
            marginLeft: -7,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: colors.white,
          }}
        />
      </View>
    </View>
  );
}
