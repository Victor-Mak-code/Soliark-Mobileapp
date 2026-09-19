'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import ContentCard from '@/components/ContentCard';
import TextToSpeechControls from '@/components/TextToSpeechControls';
import ShareJournalModal from '@/components/ShareJournalModal';
import { VideoPromptGuidelinesModal } from '@/components/VideoPromptGuidelines';
import { getJournals, updateJournal, deleteJournal, getJournal, type Journal } from '@/lib/api';
import { useI18n } from '@/i18n/I18nProvider';
import type { MessageKey } from '@/i18n/translations';
import { canCreateVideoFromJournal, useJournalVideoJobs } from '@/lib/journalVideo';
import { htmlToPlainText } from '@/components/editor/htmlUtils';

type FilterType = 'All Content' | 'Write-ups' | 'Docs' | 'Images' | 'Audio' | 'Video';

const FILTER_KEYS: Record<FilterType, MessageKey> = {
  'All Content': 'library.filter.all',
  'Write-ups': 'library.filter.writeups',
  Docs: 'library.filter.docs',
  Images: 'library.filter.images',
  Audio: 'library.filter.audio',
  Video: 'library.filter.video',
};

interface ContentItem {
  id: string;
  title: string;
  type: 'Text' | 'Audio' | 'Video' | 'Image' | 'Doc';
  date: string;
  description: string;
  isStarred: boolean;
}

export default function LibraryPage() {
  const { t } = useI18n();
  const [activeFilter, setActiveFilter] = useState<FilterType>('All Content');
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showTTS, setShowTTS] = useState(false);
  const [ttsText, setTtsText] = useState('');
  const [currentJournalId, setCurrentJournalId] = useState<string | null>(null);
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    journalId: string;
    journalTitle: string;
  } | null>(null);
  const [showPromptTips, setShowPromptTips] = useState(false);
  const router = useRouter();

  const fetchJournals = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError('');
      }
      const response = await getJournals();
      if (response.data && Array.isArray(response.data)) {
        setJournals(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('library.loadFailed'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t]);

  const { generatingIds, startForJournal, cardStatus } = useJournalVideoJobs({
    onCompleted: async () => {
      setActiveFilter((prev) =>
        prev === 'All Content' || prev === 'Video' ? prev : 'All Content'
      );
      await fetchJournals(true);
    },
  });

  const filters: FilterType[] = ['All Content', 'Write-ups', 'Docs', 'Images', 'Audio', 'Video'];

  useEffect(() => {
    void fetchJournals();
  }, [fetchJournals]);

  const handleCreateVideo = (journalId: string) => {
    const journal = journals.find((item) => item._id === journalId);
    if (!journal || !canCreateVideoFromJournal(journal)) return;
    void startForJournal(journal);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const mapJournalType = (type: string): 'Text' | 'Audio' | 'Video' | 'Image' | 'Doc' => {
    switch (type) {
      case 'text':
        return 'Text';
      case 'doc':
      case 'document':
      case 'pdf':
        return 'Doc';
      case 'image':
        return 'Image';
      case 'audio':
        return 'Audio';
      case 'video':
        return 'Video';
      default:
        return 'Text';
    }
  };

  const getDescription = (content: string, maxLength: number = 150) => {
    const plain = htmlToPlainText(content) || content;
    if (plain.length <= maxLength) return plain;
    return plain.substring(0, maxLength) + '...';
  };

  const convertToContentItems = (journals: Journal[]): ContentItem[] => {
    return journals.map((journal) => ({
      id: journal._id,
      title: journal.title || 'Untitled Journal',
      type: mapJournalType(journal.type),
      date: formatDate(journal.createdAt),
      description: getDescription(journal.content),
      isStarred: journal.isStarred,
    }));
  };

  const contentItems = convertToContentItems(journals);

  const filteredContent = activeFilter === 'All Content'
    ? contentItems
    : contentItems.filter(item => {
        if (activeFilter === 'Write-ups') return item.type === 'Text';
        if (activeFilter === 'Docs') return item.type === 'Doc';
        if (activeFilter === 'Images') return item.type === 'Image';
        if (activeFilter === 'Audio') return item.type === 'Audio';
        if (activeFilter === 'Video') return item.type === 'Video';
        return false;
      });

  const handleStar = async (id: string, currentStarred: boolean) => {
    try {
      // Optimistically update the UI
      setJournals(prevJournals => 
        prevJournals.map(journal => 
          journal._id === id ? { ...journal, isStarred: !currentStarred } : journal
        )
      );
      
      // Update in database
      await updateJournal(id, { isStarred: !currentStarred });
      
      // Refresh to ensure consistency
      await fetchJournals();
    } catch (err: any) {
      setError(err.message || 'Failed to update journal');
      // Revert optimistic update on error
      await fetchJournals();
    }
  };

  const handleView = (id: string) => {
    router.push(`/journals/${id}`);
  };

  const handleListen = async (id: string) => {
    try {
      setError('');
      setCurrentJournalId(id);

      // Fetch the full journal
      const response = await getJournal(id);
      if (!response.data) {
        setError('Journal not found');
        return;
      }

      const journal = response.data as Journal;

      // Only allow text-to-speech for text journals
      if (journal.type === 'text') {
        setTtsText(htmlToPlainText(journal.content));
        setShowTTS(true);
      } else {
        setError('Text-to-speech is only available for text journals');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to prepare text for reading');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this journal?')) {
      try {
        await deleteJournal(id);
        await fetchJournals();
      } catch (err: any) {
        setError(err.message || 'Failed to delete journal');
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-stone-100 mb-2">{t('library.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-stone-300">{t('library.subtitle')}</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
                activeFilter === filter
                  ? 'bg-[rgb(112,130,56)] text-white'
                  : 'bg-white dark:bg-stone-900 text-gray-700 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 border border-gray-200 dark:border-stone-700'
              }`}
            >
              {t(FILTER_KEYS[filter])}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(112,130,56)] mb-4"></div>
              <p className="text-gray-600 dark:text-stone-300">{t('library.loading')}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredContent.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="relative mb-6">
              <div className="text-8xl animate-bounce">📚</div>
              <div className="absolute -top-2 -right-2 text-4xl animate-pulse">✨</div>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-stone-100 mb-2">{t('library.empty')}</h3>
            <p className="text-gray-600 dark:text-stone-300 text-center mb-6 max-w-md">
              {activeFilter === 'All Content' ? t('library.emptyHint') : t('library.emptyFilter')}
            </p>
            <button
              onClick={() => router.push('/journals')}
              className="px-6 py-3 bg-[rgb(112,130,56)] text-white rounded-lg font-medium hover:bg-[rgb(95,110,48)] transition-colors flex items-center gap-2"
            >
              <span>✍️</span>
              <span>{t('library.createFirst')}</span>
            </button>
          </div>
        )}

        {/* Text-to-Speech Controls */}
        {showTTS && (
          <div className="mb-6">
            <TextToSpeechControls
              text={ttsText}
              onClose={() => {
                setShowTTS(false);
                setCurrentJournalId(null);
              }}
              autoPlay={true}
            />
          </div>
        )}

        {/* Content Cards */}
        {!loading && filteredContent.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {filteredContent.map((item) => (
              <ContentCard
                key={item.id}
                id={item.id}
                title={item.title}
                type={item.type}
                date={item.date}
                description={item.description}
                isStarred={item.isStarred}
                onView={() => handleView(item.id)}
                onListen={(item.type === 'Text' || item.type === 'Audio') ? () => handleListen(item.id) : undefined}
                onCreateVideo={
                  item.type === 'Text' || item.type === 'Doc'
                    ? () => void handleCreateVideo(item.id)
                    : undefined
                }
                onPromptTips={
                  item.type === 'Text' || item.type === 'Doc'
                    ? () => setShowPromptTips(true)
                    : undefined
                }
                createVideoBusy={generatingIds.has(item.id)}
                createVideoStatus={cardStatus(item.id)}
                onStar={!item.isStarred ? () => handleStar(item.id, item.isStarred) : undefined}
                onUnstar={item.isStarred ? () => handleStar(item.id, item.isStarred) : undefined}
                onShare={() =>
                  setShareModal({
                    open: true,
                    journalId: item.id,
                    journalTitle: item.title,
                  })
                }
              />
            ))}
          </div>
        )}

        <ShareJournalModal
          open={!!shareModal}
          journalId={shareModal?.journalId ?? null}
          journalTitle={shareModal?.journalTitle}
          onClose={() => setShareModal(null)}
        />
        <VideoPromptGuidelinesModal
          open={showPromptTips}
          onClose={() => setShowPromptTips(false)}
        />
      </div>
    </DashboardLayout>
  );
}

