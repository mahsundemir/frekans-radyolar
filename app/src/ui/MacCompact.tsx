import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {usePlayer} from '../PlayerContext';
import {colors} from '../theme';
import Badge from './Badge';
import Marquee from './Marquee';
import Waveform from './Waveform';

// Daralmış ada: çentiğin solunda radyo ve kayan şarkı adı, sağında ses dalgası.
export default function MacCompact({
  notchWidth,
  width,
}: {
  notchWidth: number;
  width: number;
}) {
  const p = usePlayer();
  const st = p.current ?? p.stations[0];
  if (!st) {
    return null;
  }
  const song = [p.meta?.artist, p.meta?.title].filter(Boolean).join(' — ');
  const line =
    p.status === 'error'
      ? p.t('streamFailed')
      : p.status === 'buffering'
      ? p.t('connectingNamed', {name: st.name})
      : song
      ? `${st.name} · ${song}`
      : p.status === 'playing'
      ? p.t('liveNamed', {name: st.name})
      : st.name;
  const ear = notchWidth > 0 ? (width - notchWidth) / 2 : width;

  return (
    <View style={styles.root}>
      <View style={[styles.left, {width: ear}]}>
        <Badge station={st} active={p.status === 'playing'} size={20} />
        <Marquee text={line} style={styles.text} />
      </View>
      {notchWidth > 0 && <View style={{width: notchWidth}} />}
      {notchWidth > 0 && (
        <View style={[styles.right, {width: ear}]}>
          <Waveform
            count={5}
            barWidth={3}
            height={14}
            gap={2}
            color={st.color}
            active={p.status === 'playing'}
          />
        </View>
      )}
      <View style={[styles.glow, {backgroundColor: st.color}]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#000'},
  left: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 8},
  right: {alignItems: 'center', justifyContent: 'center'},
  glow: {position: 'absolute', left: 12, right: 12, bottom: 0, height: 2, borderRadius: 2, opacity: 0.5},
  text: {color: colors.text, fontSize: 12, fontWeight: '600'},
});
