'use client';

import { useI18n } from '@/i18n/I18nProvider';

const BULLET_KEYS = [
  'videoPrompt.bullet1',
  'videoPrompt.bullet2',
  'videoPrompt.bullet3',
  'videoPrompt.bullet4',
  'videoPrompt.bullet5',
] as const;

export function VideoPromptGuidelinesBody() {
  const { t } = useI18n();

  return (
    <div className="text-sm text-gray-600 dark:text-stone-300 space-y-3">
      <p>{t('videoPrompt.intro')}</p>
      <ul className="list-disc pl-5 space-y-2">
        {BULLET_KEYS.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
      <p className="text-gray-700 dark:text-stone-200">{t('videoPrompt.example')}</p>
    </div>
  );
}

export default function VideoPromptGuidelines({
  className = '',
}: {
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <details
      className={`rounded-lg border border-gray-200 dark:border-stone-700 bg-gray-50 dark:bg-stone-800/60 ${className}`}
    >
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-gray-800 dark:text-stone-100">
        {t('videoPrompt.title')}
      </summary>
      <div className="px-3 pb-3">
        <VideoPromptGuidelinesBody />
      </div>
    </details>
  );
}

export function VideoPromptGuidelinesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-prompt-guidelines-title"
        className="relative z-10 w-full max-w-lg rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2
            id="video-prompt-guidelines-title"
            className="text-lg font-semibold text-gray-800 dark:text-stone-100"
          >
            {t('videoPrompt.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 dark:text-stone-400 hover:text-gray-800 dark:hover:text-stone-100"
          >
            {t('common.close')}
          </button>
        </div>
        <VideoPromptGuidelinesBody />
      </div>
    </div>
  );
}
