'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { forgotPassword } from '@/lib/api';
import { startPasswordResetFlow } from '@/components/OtpVerify';
import { useI18n } from '@/i18n/I18nProvider';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      startPasswordResetFlow(email.trim().toLowerCase());
      router.push('/auth/forgot-password/verify');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[rgb(112,130,56)]/10 to-[rgb(230,168,77)]/10 px-4 dark:from-stone-950 dark:to-stone-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-stone-900">
        <h2 className="mb-2 text-3xl font-semibold text-[rgb(112,130,56)]">{t('auth.forgotTitle')}</h2>
        <p className="mb-6 text-gray-600 dark:text-stone-400">{t('auth.forgotSubtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-stone-300">
              {t('auth.email')}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              placeholder="Enter your email"
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
            {loading ? t('auth.forgotSending') : t('auth.forgotSendCode')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-stone-400">
          <Link href="/auth" className="font-medium text-[rgb(230,168,77)] hover:underline">
            {t('auth.forgotBackToSignIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
