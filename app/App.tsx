import React, {useState} from 'react';
import {Platform, StatusBar, View} from 'react-native';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import {PlayerProvider} from './src/PlayerContext';
import {colors} from './src/theme';
import MacPanel from './src/ui/MacPanel';
import PhoneScreen from './src/ui/PhoneScreen';
import StationsScreen from './src/ui/StationsScreen';

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
        {Platform.OS === 'macos' ? <MacPanel /> : <PhoneApp />}
      </PlayerProvider>
    </SafeAreaProvider>
  );
}
