import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleProp, Text, TextStyle, View} from 'react-native';
import {usePlayer} from '../PlayerContext';

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

  // Pil tasarrufu: kayan yazı kapalı. Aksi halde saniyede ~15 adımla kayar
  // (60 kare/sn JS animasyonu yerine; enerji tüketimi çok daha az).
  const {saver} = usePlayer();
  const animate = overflow && !saver;

  useEffect(() => {
    x.setValue(0);
    if (!animate) {
      return;
    }
    const dist = textW + gap;
    const dt = 66;
    let pos = 0;
    let wait = Math.round(1400 / dt);
    const id = setInterval(() => {
      if (wait > 0) {
        wait--;
        return;
      }
      pos += (speed * dt) / 1000;
      if (pos >= dist) {
        pos = 0;
        wait = Math.round(1400 / dt);
      }
      x.setValue(-pos);
    }, dt);
    return () => clearInterval(id);
  }, [animate, textW, gap, speed, x, text]);

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
          width: textW > 0 ? (animate ? textW * 2 + gap : textW) : 4000,
          transform: [{translateX: x}],
        }}>
        <Text style={[style, {width: textW > 0 ? textW : undefined}]}>{text}</Text>
        {animate && (
          <Text style={[style, {width: textW, marginLeft: gap}]}>{text}</Text>
        )}
      </Animated.View>
    </View>
  );
}
