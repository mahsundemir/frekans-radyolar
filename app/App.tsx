import React, {useState} from 'react';
import {NativeModules, Platform, StatusBar, View} from 'react-native';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import {PlayerProvider} from './src/PlayerContext';
import {colors} from './src/theme';
import {useIsland} from './src/island';
import ColorSheet from './src/ui/ColorSheet';
import MacCard from './src/ui/MacCard';
import MacCompact from './src/ui/MacCompact';
import MacPanel from './src/ui/MacPanel';
import PhoneScreen from './src/ui/PhoneScreen';
import StationsScreen from './src/ui/StationsScreen';

const setIslandTall = (tall: boolean) => NativeModules.FrekansAudio?.setIslandTall?.(tall);

// Mac: çentik adası. Daralmışken radyo ve kayan şarkı adı, üzerine gelince oynatıcı ve liste.
function MacApp() {
  const island = useIsland();
  return (
    <View style={{flex: 1, backgroundColor: '#000'}}>
      {island.expanded ? (
        <View style={{flex: 1, paddingTop: island.notchHeight}}>
          {island.tall ? (
            <MacPanel onCollapse={() => setIslandTall(false)} />
          ) : (
            <MacCard onOpenList={() => setIslandTall(true)} />
          )}
        </View>
      ) : (
        <MacCompact notchWidth={island.notchWidth} width={island.collapsedWidth} />
      )}
    </View>
  );
}

function PhoneApp() {
  const [screen, setScreen] = useState<'player' | 'stations'>('player');
  const insets = useSafeAreaInsets();
  if (screen === 'stations') {
    return (
      <View style={{flex: 1, backgroundColor: colors.bg, paddingTop: insets.top}}>
        <StationsScreen onBack={() => setScreen('player')} />
      </View>
    );
  }
  return <PhoneScreen onOpenList={() => setScreen('stations')} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <PlayerProvider>
        {Platform.OS === 'macos' ? <MacApp /> : <PhoneApp />}
        <ColorSheet />
      </PlayerProvider>
    </SafeAreaProvider>
  );
}
