import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OnboardingScreen } from './src/onboarding/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { colors } from './src/theme';

const ONBOARDING_KEY = '@journalvideo/onboarding-complete';
const AUTH_KEY = '@journalvideo/auth-session';

type Screen = 'onboarding' | 'login' | 'home';

export default function App() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('onboarding');

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(AUTH_KEY)
      .then((authValue) => {
        if (!cancelled) {
          setScreen(authValue === 'true' ? 'home' : 'onboarding');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });

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
        <ActivityIndicator color={colors.cream} />
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
});
