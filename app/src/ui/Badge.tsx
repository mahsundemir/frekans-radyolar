import React, {useEffect, useState} from 'react';
import {Image, NativeModules, Text, View} from 'react-native';
import {colors} from '../theme';
import type {FlatStation} from '../types';

const Native = NativeModules.FrekansAudio;

// Logo adresi → siyah-beyaz kopyanın yerel adresi (null: logo açılmadı). Aynı logo bir kez işlenir.
const gray = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

function loadGray(uri: string): Promise<string | null> {
  const hit = pending.get(uri);
  if (hit) {
    return hit;
  }
  const job: Promise<string | null> = (
    Native?.grayLogo ? Native.grayLogo(uri) : Promise.reject(new Error('yok'))
  )
    .then((local: string) => local)
    .catch(() => null)
    .then((local: string | null) => {
      gray.set(uri, local);
      return local;
    });
  pending.set(uri, job);
  return job;
}

// undefined: henüz bilinmiyor, null: logo kullanılamıyor, metin: siyah-beyaz kopya
function useGray(uri?: string): string | null | undefined {
  const [value, setValue] = useState<string | null | undefined>(
    uri ? gray.get(uri) : null,
  );
  useEffect(() => {
    if (!uri) {
      setValue(null);
      return;
    }
    const known = gray.get(uri);
    if (known !== undefined) {
      setValue(known);
      return;
    }
    let live = true;
    loadGray(uri).then(v => live && setValue(v));
    return () => {
      live = false;
    };
  }, [uri]);
  return value;
}

type Props = {
  station: Pick<FlatStation, 'short' | 'logo' | 'color' | 'ink' | 'id'>;
  active: boolean;
  size?: number;
  circle?: boolean;
};

// Radyo rozeti: logo varsa pasifken siyah-beyaz, aktifken renkli; logo yoksa (ya da açılmazsa) baş harfler.
// Baş harfli rozet de aynı kurala uyar: pasifken nötr gri, aktifken radyonun rengi.
export default function Badge({station, active, size = 36, circle}: Props) {
  const bw = useGray(station.logo);
  const radius = circle ? size / 2 : size * 0.3;
  const base = {
    width: size,
    height: size,
    borderRadius: radius,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  if (station.logo && bw) {
    const inner = Math.round(size * 0.82);
    return (
      <View style={[base, {backgroundColor: '#FFFFFF'}]}>
        <Image
          source={{uri: active ? station.logo : bw}}
          style={{width: inner, height: inner, opacity: active ? 1 : 0.7}}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={[base, {backgroundColor: active ? station.color : colors.surface3}]}>
      <Text
        style={{
          color: active ? station.ink : colors.muted,
          fontSize: size * 0.36,
          fontWeight: '800',
          letterSpacing: -0.3,
        }}>
        {station.short}
      </Text>
    </View>
  );
}
