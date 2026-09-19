import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { NavigationProvider } from './src/navigation';
import { OnboardingScreen } from './src/onboarding/OnboardingScreen';
import { AuthScreen } from './src/screens/auth/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { colors } from './src/theme';

const ONBOARDING_KEY = '@journalvideo/onboarding-complete';

function Root() {
  const { status } = useAuth();
  const [onboarding, setOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setOnboarding(value !== 'true');
    });
  }, []);

  if (status === 'loading' || onboarding === null) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.olive} />
      </View>
    );
  }

  if (onboarding) {
    return (
      <OnboardingScreen
        onComplete={async () => {
          await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
          setOnboarding(false);
        }}
      />
    );
  }

  if (status !== 'authenticated') {
    return <AuthScreen />;
  }

  return (
    <NavigationProvider>
      <DashboardScreen
        onReplayOnboarding={async () => {
          await AsyncStorage.removeItem(ONBOARDING_KEY);
          setOnboarding(true);
        }}
      />
    </NavigationProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
