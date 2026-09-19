import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  forgotPassword,
  resendOtp,
  resendResetOtp,
  resetPassword,
  searchUniversities,
  verifyResetOtp,
  type UniversityItem,
} from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { Banner, OutlineButton, PrimaryButton, TextField } from '../../components/ui';
import { colors } from '../../theme';

type AuthView = 'login' | 'signup' | 'verify' | 'forgot' | 'reset-verify' | 'reset';

const OTP_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInAsGuest, confirmOtp } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [universityName, setUniversityName] = useState('');
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const onUniversityChange = (value: string) => {
    setUniversityName(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      searchUniversities(value)
        .then(setUniversities)
        .catch(() => setUniversities([]));
    }, 250);
  };

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
        universityName: universityName.trim() || undefined,
      });
      setEmail(result.email);
      setView('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError('');
    setGuestLoading(true);
    try {
      await signInAsGuest();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start guest session');
    } finally {
      setGuestLoading(false);
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
                <View style={styles.orRow}>
                  <View style={styles.line} />
                  <Text style={styles.or}>or</Text>
                  <View style={styles.line} />
                </View>
                <OutlineButton label={guestLoading ? 'Starting guest session...' : 'Continue as Guest'} onPress={() => void handleGuest()} disabled={guestLoading} />
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
                <TextField label="University" value={universityName} onChangeText={onUniversityChange} placeholder="Start typing your university..." />
                {universities.slice(0, 5).map((uni) => (
                  <Pressable key={uni._id} onPress={() => { setUniversityName(uni.name); setUniversities([]); }} style={styles.uni}>
                    <Text>{uni.name}</Text>
                  </Pressable>
                ))}
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

function OtpBoxes({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const refs = useRef<Array<TextInput | null>>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '');

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
          maxLength={1}
          onChangeText={(text) => {
            const nextDigit = text.replace(/\D/g, '').slice(-1);
            const chars = digits.slice();
            chars[index] = nextDigit;
            const joined = chars.join('').slice(0, OTP_LENGTH);
            onChange(joined);
            if (nextDigit && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
          }}
          style={styles.otp}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 28, paddingTop: 24 },
  brand: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.olive, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoMark: { color: colors.white, fontSize: 24, fontWeight: '800' },
  brandName: { fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  heading: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 6, letterSpacing: -0.8 },
  sub: { fontSize: 16, color: colors.textMuted, marginBottom: 24, lineHeight: 22 },
  row: { flexDirection: 'row', gap: 10 },
  linkWrap: { alignSelf: 'flex-end', marginBottom: 12 },
  link: { color: colors.orange, fontWeight: '700' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
  or: { fontSize: 12, color: colors.textMuted },
  switchText: { marginTop: 18, textAlign: 'center', color: colors.textMuted },
  uni: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  otp: {
    width: 46,
    height: 54,
    backgroundColor: colors.white,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
});
