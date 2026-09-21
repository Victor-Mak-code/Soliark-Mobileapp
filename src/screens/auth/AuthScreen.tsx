import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  forgotPassword,
  resendOtp,
  resendResetOtp,
  resetPassword,
  verifyResetOtp,
} from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { Banner, PrimaryButton, TextField } from '../../components/ui';
import { colors } from '../../theme';

type AuthView = 'login' | 'signup' | 'verify' | 'forgot' | 'reset-verify' | 'reset';

const OTP_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, confirmOtp } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const result = await signIn({ email: email.trim(), password });
      if (result.requiresVerification && result.email) {
        setEmail(result.email);
        setOtp('');
        setView('verify');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setError('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const result = await signUp({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });
      setEmail(result.email);
      setOtp('');
      setView('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) return;
    setError('');
    setLoading(true);
    try {
      await confirmOtp(email, otp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setOtp('');
      setView('reset-verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetVerify = async () => {
    if (otp.length !== OTP_LENGTH) return;
    setError('');
    setLoading(true);
    try {
      const result = await verifyResetOtp(email.trim(), otp);
      setResetToken(result.resetToken);
      setPassword('');
      setConfirm('');
      setView('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim(), resetToken, password);
      setInfo('Your password was updated. Sign in with your new password.');
      setPassword('');
      setView('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}><Text style={styles.logoMark}>S</Text></View>
            <Text style={styles.brandName}>Soliark</Text>
          </View>
          <View>
            {view === 'login' ? (
              <>
                <Text style={styles.heading}>Welcome Back</Text>
                <Text style={styles.sub}>Sign in to your account</Text>
                {info ? <Banner message={info} tone="success" /> : null}
                <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Enter your email" />
                <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Enter your password" />
                <Pressable onPress={() => { setError(''); setView('forgot'); }} style={styles.linkWrap}>
                  <Text style={styles.link}>Forgot password?</Text>
                </Pressable>
                {error ? <Banner message={error} /> : null}
                <PrimaryButton label={loading ? 'Signing in...' : 'Sign In'} onPress={() => void handleLogin()} loading={loading} />
                <Text style={styles.switchText}>
                  Don't have an account?{' '}
                  <Text style={styles.link} onPress={() => { setError(''); setView('signup'); }}>
                    Sign up
                  </Text>
                </Text>
              </>
            ) : null}

            {view === 'signup' ? (
              <>
                <Text style={styles.heading}>Create Account</Text>
                <Text style={styles.sub}>Sign up to get started</Text>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <TextField label="First Name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
                  </View>
                </View>
                <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Enter your email" />
                <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" />
                {error ? <Banner message={error} /> : null}
                <PrimaryButton label={loading ? 'Creating account...' : 'Sign Up'} onPress={() => void handleSignup()} loading={loading} />
                <Text style={styles.switchText}>
                  Already have an account?{' '}
                  <Text style={styles.link} onPress={() => { setError(''); setView('login'); }}>
                    Sign in
                  </Text>
                </Text>
              </>
            ) : null}

            {view === 'verify' || view === 'reset-verify' ? (
              <>
                <Text style={styles.heading}>{view === 'verify' ? 'Check your email' : 'Enter your reset code'}</Text>
                <Text style={styles.sub}>We sent a 6-digit code to {email}</Text>
                <OtpBoxes value={otp} onChange={setOtp} />
                {error ? <Banner message={error} /> : null}
                <PrimaryButton
                  label={loading ? 'Verifying...' : 'Verify'}
                  onPress={() => void (view === 'verify' ? handleVerify() : handleResetVerify())}
                  loading={loading}
                  disabled={otp.length !== OTP_LENGTH}
                />
                <Pressable
                  onPress={() => void (view === 'verify' ? resendOtp(email) : resendResetOtp(email))}
                  style={styles.linkWrap}
                >
                  <Text style={styles.link}>Resend OTP</Text>
                </Pressable>
              </>
            ) : null}

            {view === 'forgot' ? (
              <>
                <Text style={styles.heading}>Reset your password</Text>
                <Text style={styles.sub}>Enter the email for your account and we'll send a 6-digit code.</Text>
                <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Enter your email" />
                {error ? <Banner message={error} /> : null}
                <PrimaryButton label={loading ? 'Sending code...' : 'Send code'} onPress={() => void handleForgot()} loading={loading} />
                <Pressable onPress={() => setView('login')} style={styles.linkWrap}>
                  <Text style={styles.link}>Back to sign in</Text>
                </Pressable>
              </>
            ) : null}

            {view === 'reset' ? (
              <>
                <Text style={styles.heading}>Choose a new password</Text>
                <Text style={styles.sub}>Enter a new password for {email}</Text>
                <TextField label="New password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" />
                <TextField label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Re-enter password" />
                {error ? <Banner message={error} /> : null}
                <PrimaryButton label={loading ? 'Updating...' : 'Update password'} onPress={() => void handleReset()} loading={loading} />
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function extractOtpCode(raw: string): string {
  const compact = raw.trim().replace(/[\s-]/g, '');
  if (/^\d{6}$/.test(compact)) return compact;
  const match = raw.match(/(?:^|\D)(\d{6})(?:\D|$)/);
  return match?.[1] ?? '';
}

function OtpBoxes({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const refs = useRef<Array<TextInput | null>>([]);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '');

  useEffect(() => {
    refs.current[0]?.focus();

    const fillFromClipboard = async () => {
      if (valueRef.current.length === OTP_LENGTH) return;
      try {
        const clip = await Clipboard.getStringAsync();
        const code = extractOtpCode(clip);
        if (code.length === OTP_LENGTH) onChangeRef.current(code);
      } catch {
        // iOS may block clipboard until the user pastes.
      }
    };

    void fillFromClipboard();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void fillFromClipboard();
    });
    const clipboard = Clipboard.addClipboardListener(() => {
      void fillFromClipboard();
    });
    return () => {
      appState.remove();
      Clipboard.removeClipboardListener(clipboard);
    };
  }, []);

  const applyInput = (raw: string, index: number) => {
    const incoming = raw.replace(/\D/g, '');
    if (incoming.length > 1) {
      if (incoming.length >= OTP_LENGTH) {
        onChange(incoming.slice(0, OTP_LENGTH));
        refs.current[OTP_LENGTH - 1]?.focus();
        return;
      }
      const chars = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '');
      incoming.split('').forEach((digit, offset) => {
        if (index + offset < OTP_LENGTH) chars[index + offset] = digit;
      });
      onChange(chars.join('').slice(0, OTP_LENGTH));
      refs.current[Math.min(index + incoming.length, OTP_LENGTH) - 1]?.focus();
      return;
    }

    const chars = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '');
    chars[index] = incoming.slice(-1);
    onChange(chars.join('').slice(0, OTP_LENGTH));
    if (incoming && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
  };

  return (
    <View style={styles.otpRow}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={digit}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={OTP_LENGTH}
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
          importantForAutofill="yes"
          autoCorrect={false}
          selectTextOnFocus
          onChangeText={(text) => applyInput(text, index)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
              const chars = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '');
              chars[index - 1] = '';
              onChange(chars.join(''));
              refs.current[index - 1]?.focus();
            }
          }}
          style={styles.otp}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 28 },
  brand: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.olive, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoMark: { color: colors.white, fontSize: 24, fontWeight: '800' },
  brandName: { fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  heading: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 6, letterSpacing: -0.8, textAlign: 'center' },
  sub: { fontSize: 16, color: colors.textMuted, marginBottom: 24, lineHeight: 22, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  linkWrap: { alignSelf: 'center', marginBottom: 12, marginTop: 4 },
  link: { color: colors.orange, fontWeight: '700' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
  or: { fontSize: 12, color: colors.textMuted },
  switchText: { marginTop: 18, textAlign: 'center', color: colors.textMuted },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  otp: {
    width: 46,
    height: 54,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#C9C4B8',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
});
