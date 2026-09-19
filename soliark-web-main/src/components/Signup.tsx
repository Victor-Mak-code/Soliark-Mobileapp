'use client';

import { useEffect, useRef, useState } from 'react';
import { signup, searchUniversities, type SignupData, type UniversityItem } from '@/lib/api';
import { useI18n } from '@/i18n/I18nProvider';

interface SignupProps {
  onSuccess?: (email: string) => void;
  onSwitchToLogin?: () => void;
}

export default function Signup({ onSuccess, onSwitchToLogin }: SignupProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState<SignupData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    universityName: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [universityResults, setUniversityResults] = useState<UniversityItem[]>([]);
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const universitySearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (universitySearchTimeout.current) clearTimeout(universitySearchTimeout.current);
    };
  }, []);

  const handleUniversityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, universityName: value }));
    setShowUniversityDropdown(true);

    if (universitySearchTimeout.current) clearTimeout(universitySearchTimeout.current);
    universitySearchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchUniversities(value);
        setUniversityResults(results);
      } catch {
        setUniversityResults([]);
      }
    }, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signup(formData);
      onSuccess?.(result.email || formData.email);
    } catch (err: any) {
      setError(err.message || t('auth.signupFailed'));
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
      <h2 className="text-3xl font-semibold mb-2 text-[rgb(112,130,56)]">{t('auth.createAccount')}</h2>
      <p className="text-gray-600 dark:text-stone-400 mb-6">{t('auth.signUpSubtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-1">
              {t('auth.firstName')}
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] focus:border-transparent"
              placeholder="First name"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-1">
              {t('auth.lastName')}
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] focus:border-transparent"
              placeholder="Last name"
            />
          </div>
        </div>

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
            minLength={6}
            className="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] focus:border-transparent"
            placeholder="At least 6 characters"
          />
        </div>

        <div className="relative">
          <label htmlFor="universityName" className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-1">
            {t('auth.university')}
          </label>
          <input
            type="text"
            id="universityName"
            name="universityName"
            value={formData.universityName}
            onChange={handleUniversityChange}
            onFocus={() => setShowUniversityDropdown(true)}
            onBlur={() => setTimeout(() => setShowUniversityDropdown(false), 150)}
            autoComplete="off"
            className="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] focus:border-transparent"
            placeholder={t('auth.universityPlaceholder')}
          />
          {showUniversityDropdown && universityResults.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {universityResults.map((uni) => (
                <button
                  key={uni._id}
                  type="button"
                  onMouseDown={() => {
                    setFormData((prev) => ({ ...prev, universityName: uni.name }));
                    setShowUniversityDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-stone-100 hover:bg-gray-50 dark:hover:bg-stone-800"
                >
                  {uni.name}
                </button>
              ))}
            </div>
          )}
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
          {loading ? t('auth.creatingAccount') : t('auth.signUpButton')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-stone-400">
          {t('auth.haveAccount')}{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[rgb(230,168,77)] font-medium hover:underline"
          >
            {t('auth.signInLink')}
          </button>
        </p>
      </div>
    </div>
  );
}

