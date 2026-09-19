'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PENDING_RESET_EMAIL_KEY,
  RESET_TOKEN_KEY,
} from '@/components/OtpVerify';
import { resetPassword } from '@/lib/api';
import { useI18n } from '@/i18n/I18nProvider';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem(PENDING_RESET_EMAIL_KEY);
    const token = sessionStorage.getItem(RESET_TOKEN_KEY);
    if (!pendingEmail || !token) {
      router.replace('/auth/forgot-password');
      return;
    }
    setEmail(pendingEmail);
    setResetToken(token);
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !resetToken) return;
    setError('');

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, resetToken, password);
      sessionStorage.removeItem(PENDING_RESET_EMAIL_KEY);
      sessionStorage.removeItem(RESET_TOKEN_KEY);
      router.replace('/auth?reset=1');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!email || !resetToken) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[rgb(112,130,56)]/10 to-[rgb(230,168,77)]/10 px-4 dark:from-stone-950 dark:to-stone-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-stone-900">
        <h2 className="mb-2 text-3xl font-semibold text-[rgb(112,130,56)]">{t('auth.resetTitle')}</h2>
        <p className="mb-6 text-gray-600 dark:text-stone-400">{t('auth.resetSubtitle', { email })}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="newPassword"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-stone-300"
            >
              {t('auth.newPassword')}
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-stone-300"
            >
              {t('auth.confirmPassword')}
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              placeholder="Re-enter password"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[rgb(112,130,56)] px-4 py-3 font-medium text-white transition-colors hover:bg-[rgb(95,110,48)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t('auth.resetting') : t('auth.resetSubmit')}
          </button>
        </form>
      </div>
    </div>
  );
}
