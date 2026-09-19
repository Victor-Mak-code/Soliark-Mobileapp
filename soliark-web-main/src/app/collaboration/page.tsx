'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getCollaborationJournals, type CollaborationJournalListItem } from '@/lib/api';
import { useI18n } from '@/i18n/I18nProvider';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CollaborationPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [list, setList] = useState<CollaborationJournalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchList = useCallback(async () => {
    try {
      setError('');
      const response = await getCollaborationJournals();
      if (response.data) setList(response.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load collaboration journals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-stone-100">{t('collaboration.title')}</h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-stone-300">
            {t('collaboration.subtitle')}
          </p>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(112,130,56)] mb-4" />
              <p className="text-gray-600 dark:text-stone-300">Loading...</p>
            </div>
          </div>
        )}

        {!loading && list.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700">
            <p className="text-6xl mb-4">👤+</p>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-stone-100 mb-2">
              No collaboration journals yet
            </h3>
            <p className="text-gray-600 dark:text-stone-300 text-center max-w-md">
              When you create or are shared a journal that has at least one editor (besides you), it will appear here.
            </p>
          </div>
        )}

        {!loading && list.length > 0 && (
          <div className="space-y-3">
            {list.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => router.push(`/collaboration/${item._id}`)}
                className="w-full text-left bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-[rgb(112,130,56)]/30 transition-all"
              >
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-stone-100 truncate">
                  {item.title || 'Untitled'}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-stone-400 mt-1">
                  Last modified {formatRelativeTime(item.updatedAt)}
                  {item.owner && (
                    <span className="ml-2">
                      · {item.owner.firstName} {item.owner.lastName}
                    </span>
                  )}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
