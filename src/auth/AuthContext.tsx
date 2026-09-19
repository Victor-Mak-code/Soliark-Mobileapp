import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getCurrentUser,
  guestLogin,
  login,
  logout as apiLogout,
  signup,
  verifyOtp,
  type CurrentUser,
  type LoginData,
  type SignupData,
} from '../api';
import { persistSessionCookie } from '../api/client';

const USER_KEY = '@soliark/current-user';

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: CurrentUser | null;
  refreshUser: () => Promise<CurrentUser | null>;
  signIn: (data: LoginData) => Promise<{ requiresVerification?: boolean; email?: string }>;
  signUp: (data: SignupData) => Promise<{ email: string }>;
  signInAsGuest: () => Promise<void>;
  confirmOtp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);

  const applyUser = useCallback(async (next: CurrentUser | null) => {
    setUser(next);
    if (next) {
      setStatus('authenticated');
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(next));
    } else {
      setStatus('unauthenticated');
      await AsyncStorage.removeItem(USER_KEY);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const next = await getCurrentUser();
    await applyUser(next);
    return next;
  }, [applyUser]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(USER_KEY);
        if (cached && !cancelled) {
          setUser(JSON.parse(cached) as CurrentUser);
        }
        const next = await getCurrentUser();
        if (!cancelled) {
          await applyUser(next);
        }
      } catch {
        if (!cancelled) {
          setStatus('unauthenticated');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  const signIn = useCallback(
    async (data: LoginData) => {
      const result = await login(data);
      if (result.requiresVerification && result.email) {
        return { requiresVerification: true, email: result.email };
      }
      await refreshUser();
      return {};
    },
    [refreshUser]
  );

  const signUp = useCallback(async (data: SignupData) => {
    const result = await signup(data);
    return { email: result.email || data.email };
  }, []);

  const signInAsGuest = useCallback(async () => {
    await guestLogin();
    await refreshUser();
  }, [refreshUser]);

  const confirmOtp = useCallback(
    async (email: string, code: string) => {
      await verifyOtp(email, code);
      await refreshUser();
    },
    [refreshUser]
  );

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // still clear local session
    }
    await persistSessionCookie(null);
    await applyUser(null);
  }, [applyUser]);

  const value = useMemo(
    () => ({
      status,
      user,
      refreshUser,
      signIn,
      signUp,
      signInAsGuest,
      confirmOtp,
      signOut,
    }),
    [status, user, refreshUser, signIn, signUp, signInAsGuest, confirmOtp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
