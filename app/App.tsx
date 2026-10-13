import React, {useState} from 'react';
import {Platform, StatusBar, View} from 'react-native';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import {PlayerProvider} from './src/PlayerContext';
import {colors} from './src/theme';
import {useIsland} from './src/island';
import {useShot} from './src/shotHarness';
import MacCompact from './src/ui/MacCompact';
import MacPanel from './src/ui/MacPanel';
import PhoneScreen from './src/ui/PhoneScreen';
import StationsScreen from './src/ui/StationsScreen';

// Mac: çentik adası. Daralmışken radyo ve kayan şarkı adı, üzerine gelince oynatıcı ve liste.
function MacApp() {
  const island = useIsland();
  return (
    <View style={{flex: 1, backgroundColor: '#000'}}>
      {island.expanded ? (
        <View style={{flex: 1, paddingTop: island.notchHeight}}>
          <MacPanel />
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
  const shot = useShot();
  if ((shot.screen ?? screen) === 'stations') {
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
      </PlayerProvider>
    </SafeAreaProvider>
  );
}
