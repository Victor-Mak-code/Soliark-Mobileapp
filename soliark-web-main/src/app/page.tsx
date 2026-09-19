'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useI18n } from '@/i18n/I18nProvider';

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    // Redirect to library page by default
    router.push('/library');
  }, [router]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-stone-100 mb-4">{t('home.title')}</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-stone-300">{t('home.welcome')}</p>
      </div>
    </DashboardLayout>
  );
}
