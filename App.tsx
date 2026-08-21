import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OnboardingScreen } from './src/onboarding/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { colors } from './src/theme';

const ONBOARDING_KEY = '@journalvideo/onboarding-complete';

export default function App() {
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => {
        if (!cancelled) {
          setShowOnboarding(value !== 'true');
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
    setShowOnboarding(false);
  }, []);

  const replayOnboarding = useCallback(async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
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
      {showOnboarding ? (
        <OnboardingScreen onComplete={completeOnboarding} />
      ) : (
        <HomeScreen onReplayOnboarding={replayOnboarding} />
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
