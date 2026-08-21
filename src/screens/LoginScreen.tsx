import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilledIconCircle } from '../onboarding/IconCircles';
import { colors, spacing } from '../theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthMode = 'signin' | 'signup';

type LoginScreenProps = {
  onSuccess: () => void;
};

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const passwordRef = useRef<TextInput>(null);

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const topPad = Math.max(insets.top, 12);
  const bottomPad = Math.max(insets.bottom, 16);
  const cardWidth = Math.min(windowWidth - spacing.screen * 2, 440);
  const cardHeight = Math.min(windowHeight - topPad - bottomPad - 48, 640);

  const isSignIn = mode === 'signin';

  const submit = async () => {
    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  const continueAsDemo = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ width: cardWidth, height: cardHeight }}>
          <View style={styles.card}>
            <ScrollView
              contentContainerStyle={styles.cardContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <FilledIconCircle name="videocam-outline" backgroundColor={colors.oliveDark} />
              <Text style={styles.title}>{isSignIn ? 'Welcome back!' : 'Create account'}</Text>
              <Text style={styles.subtitle}>
                {isSignIn ? 'Sign in to continue' : 'Sign up to start creating'}
              </Text>

              <FieldLabel>Email</FieldLabel>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={colors.oliveDark} />
                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!submitting}
                  style={styles.input}
                />
              </View>

              <FieldLabel>Password</FieldLabel>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.oliveDark} />
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={submit}
                  editable={!submitting}
                  style={styles.input}
                />
                <Pressable
                  onPress={() => setShowPassword((visible) => !visible)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.oliveDark}
                  />
                </Pressable>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                onPress={submit}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel={isSignIn ? 'Sign In' : 'Sign Up'}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { opacity: submitting ? 0.7 : pressed ? 0.88 : 1 },
                ]}
              >
                <Text style={styles.primaryLabel}>{isSignIn ? 'Sign In' : 'Sign Up'}</Text>
              </Pressable>

              <View style={styles.divider} />

              <Text style={styles.switchPrompt}>
                {isSignIn ? "Don't have an account?" : 'Already have an account?'}
              </Text>
              <Pressable
                onPress={() => {
                  setMode(isSignIn ? 'signup' : 'signin');
                  setError(null);
                }}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel={isSignIn ? 'Sign Up' : 'Sign In'}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Text style={styles.secondaryLabel}>{isSignIn ? 'Sign Up' : 'Sign In'}</Text>
              </Pressable>

              <Pressable
                onPress={continueAsDemo}
                disabled={submitting}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Continue as Demo"
              >
                <Text style={styles.demo}>{submitting ? 'Continuing…' : 'Continue as Demo'}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: spacing.cardRadius,
    overflow: 'hidden',
  },
  cardContent: {
    paddingHorizontal: spacing.card,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    marginTop: 18,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 22,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  fieldLabel: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '700',
    color: colors.oliveDark,
  },
  inputWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.olive,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 12,
  },
  error: {
    alignSelf: 'flex-start',
    marginTop: -6,
    marginBottom: 10,
    fontSize: 13,
    color: colors.terracotta,
    fontWeight: '600',
  },
  primaryButton: {
    width: '100%',
    marginTop: 6,
    backgroundColor: colors.orange,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginVertical: 18,
  },
  switchPrompt: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 12,
  },
  secondaryButton: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.olive,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: colors.cream,
  },
  secondaryLabel: {
    color: colors.oliveDark,
    fontSize: 16,
    fontWeight: '700',
  },
  demo: {
    marginTop: 18,
    fontSize: 15,
    fontWeight: '700',
    color: colors.oliveDark,
  },
});
