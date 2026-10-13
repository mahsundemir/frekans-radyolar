import {useEffect, useState} from 'react';
import {NativeEventEmitter, NativeModules} from 'react-native';

const Native = NativeModules.FrekansAudio;

export type IslandInfo = {
  expanded: boolean;
  notchWidth: number; // 0: çentiksiz ekran
  notchHeight: number;
  collapsedWidth: number;
};

// macOS çentik adası: üzerine gelince genişler. Native taraf durumu ve çentik ölçülerini bildirir.
export function useIsland(): IslandInfo {
  const [info, setInfo] = useState<IslandInfo>({
    expanded: false,
    notchWidth: 0,
    notchHeight: 0,
    collapsedWidth: 240,
  });
  useEffect(() => {
    if (!Native) {
      return;
    }
    let live = true;
    Native.getIslandInfo?.().then((i: IslandInfo | null) => {
      if (live && i) {
        setInfo(i);
      }
    });
    const sub = new NativeEventEmitter(Native).addListener(
      'onIsland',
      (i: IslandInfo) => setInfo(i),
    );
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return info;
}
