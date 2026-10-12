import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  Text,
  View,
} from 'react-native';
import {colors} from '../theme';

export const FONT_DISPLAY = {fontWeight: '800' as const, letterSpacing: -1};

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
  const set = (e: GestureResponderEvent) => {
    onChange(Math.max(0, Math.min(1, e.nativeEvent.locationX / w)));
  };
  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel="Ses"
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      onPressIn={set}
      onTouchMove={set}
      style={{flex: 1, height: 28, justifyContent: 'center'}}>
      <View
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
          pointerEvents="none"
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
    </Pressable>
  );
}
