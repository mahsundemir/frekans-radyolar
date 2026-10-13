import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, StyleProp, Text, TextStyle, View} from 'react-native';

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  speed?: number; // piksel/sn
  gap?: number;
};

// Sığmayan metni sağdan sola kaydırır; sığıyorsa sabit durur.
// Ölçüm, görünen metinden bağımsız (kısıtsız) bir metinle yapılır; böylece yerleşim döngüye girmez.
export default function Marquee({text, style, speed = 28, gap = 36}: Props) {
  const [box, setBox] = useState(0);
  const [textW, setTextW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const overflow = box > 0 && textW > box + 1;

  useEffect(() => {
    x.setValue(0);
    if (!overflow) {
      return;
    }
    const dist = textW + gap;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(x, {
          toValue: -dist,
          duration: (dist / speed) * 1000,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [overflow, textW, gap, speed, x, text]);

  const setIfChanged = (set: (n: number) => void, cur: number, next: number) => {
    if (Math.abs(next - cur) > 0.5) {
      set(next);
    }
  };

  return (
    <View
      style={{flex: 1, height: 18, overflow: 'hidden'}}
      onLayout={e => setIfChanged(setBox, box, e.nativeEvent.layout.width)}>
      {/* ölçüm: çok geniş bir kutuda kısıtsız metin */}
      <View pointerEvents="none" style={{position: 'absolute', width: 4000, opacity: 0}}>
        <Text
          style={[style, {alignSelf: 'flex-start'}]}
          onLayout={e => setIfChanged(setTextW, textW, e.nativeEvent.layout.width)}>
          {text}
        </Text>
      </View>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          flexDirection: 'row',
          width: textW > 0 ? (overflow ? textW * 2 + gap : textW) : 4000,
          transform: [{translateX: x}],
        }}>
        <Text style={[style, {width: textW > 0 ? textW : undefined}]}>{text}</Text>
        {overflow && (
          <Text style={[style, {width: textW, marginLeft: gap}]}>{text}</Text>
        )}
      </Animated.View>
    </View>
  );
}
