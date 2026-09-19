'use client';

import { useState } from 'react';
import Link from 'next/link';
import { login, guestLogin, type LoginData } from '@/lib/api';
import { useI18n } from '@/i18n/I18nProvider';

interface LoginProps {
  onSuccess?: () => void;
  onNeedsVerification?: (email: string) => void;
  onSwitchToSignup?: () => void;
}

export default function Login({ onSuccess, onNeedsVerification, onSwitchToSignup }: LoginProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [guestLoading, setGuestLoading] = useState<boolean>(false);

  const handleGuestLogin = async () => {
    setError('');
    setGuestLoading(true);
    try {
      await guestLogin();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || t('auth.loginFailed'));
    } finally {
      setGuestLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData);
      if (result.requiresVerification && result.email) {
        onNeedsVerification?.(result.email);
        return;
      }
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-3xl font-semibold mb-2 text-[rgb(112,130,56)]">{t('auth.welcomeBack')}</h2>
      <p className="text-gray-600 dark:text-stone-400 mb-6">{t('auth.signInSubtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-1">
            {t('auth.email')}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] focus:border-transparent"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-1">
            {t('auth.password')}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] focus:border-transparent"
            placeholder="Enter your password"
          />
        </div>

        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-[rgb(230,168,77)] hover:underline"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-[rgb(112,130,56)] text-white rounded-lg font-medium hover:bg-[rgb(95,110,48)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200 dark:bg-stone-700" />
        <span className="text-xs text-gray-500 dark:text-stone-400">{t('auth.or')}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-stone-700" />
      </div>

      <button
        type="button"
        onClick={handleGuestLogin}
        disabled={guestLoading}
        className="w-full py-3 px-4 border border-gray-300 dark:border-stone-600 text-gray-700 dark:text-stone-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {guestLoading ? t('auth.startingGuestSession') : t('auth.continueAsGuest')}
      </button>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-stone-400">
          {t('auth.noAccount')}{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-[rgb(230,168,77)] font-medium hover:underline"
          >
            {t('auth.signUp')}
          </button>
        </p>
      </div>
    </div>
  );
}

