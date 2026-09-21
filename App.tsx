import { useState, type ComponentType } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { OnboardingScreen } from './src/onboarding/OnboardingScreen';
import { AuthScreen } from './src/screens/auth/AuthScreen';
import { colors } from './src/theme';

type DashboardProps = { onReplayOnboarding: () => void };

function AuthenticatedApp({ onReplayOnboarding }: DashboardProps) {
  const { NavigationProvider } = require('./src/navigation') as typeof import('./src/navigation');
  const { DashboardScreen } = require('./src/screens/DashboardScreen') as {
    DashboardScreen: ComponentType<DashboardProps>;
  };
  return (
    <NavigationProvider>
      <DashboardScreen onReplayOnboarding={onReplayOnboarding} />
    </NavigationProvider>
  );
}

function Root() {
  const { status } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(true);

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  if (status === 'loading') {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.olive} />
      </View>
    );
  }

  if (status === 'authenticated') {
    return <AuthenticatedApp onReplayOnboarding={() => setShowOnboarding(true)} />;
  }

  return <AuthScreen />;
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
