import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OnboardingScreen } from './src/onboarding/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { colors } from './src/theme';

const ONBOARDING_KEY = '@journalvideo/onboarding-complete';
const AUTH_KEY = '@journalvideo/auth-session';
const SPLASH_MS = 1800;

type Screen = 'onboarding' | 'login' | 'home';

export default function App() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('onboarding');

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      SplashScreen.hideAsync().catch(() => undefined);

      const [authValue] = await Promise.all([
        AsyncStorage.getItem(AUTH_KEY),
        new Promise((resolve) => setTimeout(resolve, SPLASH_MS)),
      ]);

      if (!cancelled) {
        setScreen(authValue === 'true' ? 'home' : 'onboarding');
        setReady(true);
      }
    };

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setScreen('login');
  }, []);

  const completeLogin = useCallback(async () => {
    await AsyncStorage.setItem(AUTH_KEY, 'true');
    setScreen('home');
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setScreen('login');
  }, []);

  const replayOnboarding = useCallback(async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setScreen('onboarding');
  }, []);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <Image
          source={require('./assets/jv-icon.png')}
          style={styles.bootLogo}
          resizeMode="cover"
          accessibilityLabel="JournalVideo"
        />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {screen === 'onboarding' ? (
        <OnboardingScreen onComplete={completeOnboarding} />
      ) : screen === 'login' ? (
        <LoginScreen onSuccess={completeLogin} />
      ) : (
        <HomeScreen onReplayOnboarding={replayOnboarding} onSignOut={signOut} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bootLogo: {
    width: 148,
    height: 148,
    borderRadius: 32,
  },
});
