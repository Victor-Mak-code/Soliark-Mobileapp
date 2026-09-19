'use client';

import { useI18n } from '@/i18n/I18nProvider';
import type { MessageKey } from '@/i18n/translations';

interface ContentCardProps {
  id: string;
  title: string;
  type: 'Text' | 'Audio' | 'Video' | 'Image' | 'Doc';
  date: string;
  description: string;
  isStarred: boolean;
  onView?: () => void;
  onListen?: () => void;
  onCreateVideo?: () => void;
  onPromptTips?: () => void;
  createVideoBusy?: boolean;
  createVideoStatus?: string;
  onStar?: () => void;
  onUnstar?: () => void;
  onShare?: () => void;
  viewLabel?: string; // Custom label for view button (default: translated "View")
}

const TYPE_KEYS: Record<ContentCardProps['type'], MessageKey> = {
  Text: 'type.text',
  Audio: 'type.audio',
  Video: 'type.video',
  Image: 'type.image',
  Doc: 'type.doc',
};

export default function ContentCard({
  title,
  type,
  date,
  description,
  isStarred,
  onView,
  onListen,
  onCreateVideo,
  onPromptTips,
  createVideoBusy = false,
  createVideoStatus,
  onStar,
  onUnstar,
  onShare,
  viewLabel,
}: ContentCardProps) {
  const { t } = useI18n();
  const resolvedViewLabel = viewLabel ?? t('common.view');
  const getIcon = () => {
    switch (type) {
      case 'Text':
        return '📄';
      case 'Doc':
        return '📄';
      case 'Image':
        return '🖼️';
      case 'Audio':
        return '🔊';
      case 'Video':
        return '🎥';
      default:
        return '📄';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'Text':
        return 'bg-[rgb(112,130,56)]/20 text-[rgb(112,130,56)]';
      case 'Doc':
        return 'bg-[rgb(112,130,56)]/20 text-[rgb(112,130,56)]';
      case 'Image':
        return 'bg-[rgb(112,130,56)]/20 text-[rgb(112,130,56)]';
      case 'Audio':
        return 'bg-[rgb(112,130,56)]/20 text-[rgb(112,130,56)]';
      case 'Video':
        return 'bg-[rgb(112,130,56)]/20 text-[rgb(112,130,56)]';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-stone-800 dark:text-stone-300';
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700 p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[rgb(112,130,56)] rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-xl sm:text-2xl">{getIcon()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-stone-100 truncate">{title}</h3>
            {isStarred && (
              <span className="text-yellow-500 flex-shrink-0">★</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor()}`}>
              {t(TYPE_KEYS[type])}
            </span>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-stone-400">{date}</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-stone-300 line-clamp-2">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {onView && (
          <button
            onClick={onView}
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-800 rounded transition-colors flex items-center gap-1"
          >
            <span>👁️</span>
            <span className="hidden sm:inline">{resolvedViewLabel}</span>
          </button>
        )}
        {onListen && (
          <button
            onClick={onListen}
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-800 rounded transition-colors flex items-center gap-1"
          >
            <span>🔊</span>
            <span className="hidden sm:inline">{t('common.listen')}</span>
          </button>
        )}
        {onCreateVideo && (
          <button
            onClick={onCreateVideo}
            disabled={createVideoBusy}
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-800 rounded transition-colors flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>🎥</span>
            <span className="hidden sm:inline">
              {createVideoBusy ? t('videoCreator.generating') : t('card.createVideo')}
            </span>
          </button>
        )}
        {onPromptTips && (
          <button
            onClick={onPromptTips}
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-800 rounded transition-colors flex items-center gap-1"
          >
            <span>💡</span>
            <span className="hidden sm:inline">{t('videoPrompt.tips')}</span>
          </button>
        )}
        {isStarred && onUnstar ? (
          <button
            onClick={onUnstar}
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-800 rounded transition-colors flex items-center gap-1"
          >
            <span className="text-yellow-500">★</span>
            <span className="hidden sm:inline">{t('common.unstar')}</span>
          </button>
        ) : onStar ? (
          <button
            onClick={onStar}
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-800 rounded transition-colors flex items-center gap-1"
          >
            <span>☆</span>
            <span className="hidden sm:inline">{t('common.star')}</span>
          </button>
        ) : null}
        {onShare && (
          <button
            onClick={onShare}
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-800 rounded transition-colors flex items-center gap-1"
          >
            <span>📤</span>
            <span className="hidden sm:inline">{t('common.share')}</span>
          </button>
        )}
      </div>
      {createVideoStatus && (
        <p
          className={`mt-2 text-xs sm:text-sm ${
            createVideoBusy
              ? 'text-gray-600 dark:text-stone-300'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {createVideoStatus}
        </p>
      )}
    </div>
  );
}

