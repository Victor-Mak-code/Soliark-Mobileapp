import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';

type HomeScreenProps = {
  onReplayOnboarding: () => void;
};

export function HomeScreen({ onReplayOnboarding }: HomeScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style="light" />
      <View style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name="videocam-outline" size={36} color={colors.white} />
        </View>
        <Text style={styles.title}>Your journal awaits</Text>
        <Text style={styles.description}>
          Capture a thought, turn it into audio, and watch it become a shareable video.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.88 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Start a new journal entry"
        >
          <Text style={styles.primaryLabel}>New journal entry</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.white} />
        </Pressable>
        <Pressable onPress={onReplayOnboarding} hitSlop={10} accessibilityRole="button">
          <Text style={styles.replay}>Replay onboarding</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.olive,
    paddingHorizontal: spacing.screen,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.cream,
    borderRadius: spacing.cardRadius,
    paddingHorizontal: spacing.card,
    paddingVertical: 40,
    alignItems: 'center',
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.oliveDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 24,
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.orange,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  primaryLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  replay: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
