'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import ContentCard from '@/components/ContentCard';
import TextToSpeechControls from '@/components/TextToSpeechControls';
import { getJournals, updateJournal, getJournal, type Journal } from '@/lib/api';
import { Search, Calendar, FileText, Music, Video } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { canCreateVideoFromJournal, useJournalVideoJobs } from '@/lib/journalVideo';
import { VideoPromptGuidelinesModal } from '@/components/VideoPromptGuidelines';
import { htmlToPlainText } from '@/components/editor/htmlUtils';

type FilterType = 'All Starred' | 'Text' | 'Audio' | 'Video';
type SortType = 'Date' | 'Title' | 'Type';

interface ContentItem {
  id: string;
  title: string;
  type: 'Text' | 'Audio' | 'Video' | 'Image' | 'Doc';
  date: string;
  description: string;
  isStarred: boolean;
  createdAt: string;
}

export default function StarredPage() {
  const { t } = useI18n();
  const [activeFilter, setActiveFilter] = useState<FilterType>('All Starred');
  const [activeSort, setActiveSort] = useState<SortType>('Date');
  const [searchQuery, setSearchQuery] = useState('');
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showTTS, setShowTTS] = useState(false);
  const [ttsText, setTtsText] = useState('');
  const [currentJournalId, setCurrentJournalId] = useState<string | null>(null);
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
        const starredJournals = (response.data as Journal[]).filter(journal => journal.isStarred);
        setJournals(starredJournals);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load starred journals');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const { generatingIds, startForJournal, cardStatus } = useJournalVideoJobs({
    onCompleted: async () => {
      await fetchJournals(true);
    },
  });

  const filters: FilterType[] = ['All Starred', 'Text', 'Audio', 'Video'];

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
      createdAt: journal.createdAt,
    }));
  };

  // Calculate summary counts
  const summaryCounts = useMemo(() => {
    const starredJournals = journals.filter(j => j.isStarred);
    return {
      total: starredJournals.length,
      text: starredJournals.filter(j => j.type === 'text' || j.type === 'doc').length,
      audio: starredJournals.filter(j => j.type === 'audio').length,
      video: starredJournals.filter(j => j.type === 'video').length,
    };
  }, [journals]);

  // Filter and search
  const filteredAndSearched = useMemo(() => {
    let items = convertToContentItems(journals);

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (activeFilter !== 'All Starred') {
      items = items.filter(item => {
        if (activeFilter === 'Text') return item.type === 'Text' || item.type === 'Doc';
        return item.type === activeFilter;
      });
    }

    return items;
  }, [journals, searchQuery, activeFilter]);

  // Sort items
  const sortedItems = useMemo(() => {
    const items = [...filteredAndSearched];
    
    switch (activeSort) {
      case 'Date':
        return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'Title':
        return items.sort((a, b) => a.title.localeCompare(b.title));
      case 'Type':
        return items.sort((a, b) => a.type.localeCompare(b.type));
      default:
        return items;
    }
  }, [filteredAndSearched, activeSort]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const starredJournals = journals.filter(j => j.isStarred);
    return {
      'All Starred': starredJournals.length,
      'Text': starredJournals.filter(j => j.type === 'text' || j.type === 'doc').length,
      'Audio': starredJournals.filter(j => j.type === 'audio').length,
      'Video': starredJournals.filter(j => j.type === 'video').length,
    };
  }, [journals]);

  const handleStar = async (id: string, currentStarred: boolean) => {
    try {
      // Optimistically update the UI
      setJournals(prevJournals => 
        prevJournals.filter(journal => journal._id !== id)
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

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8 bg-[#f5f5f0] dark:bg-stone-950 min-h-screen">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-stone-100 mb-2">
            {t('starred.items')}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-stone-300">
            {t('starred.subtitle')}
          </p>
        </div>

        {/* Search and Sort Section */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-stone-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('starred.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] focus:border-transparent text-sm sm:text-base bg-white dark:bg-stone-900"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-sm sm:text-base text-gray-700 dark:text-stone-300 font-medium whitespace-nowrap">{t('starred.sortBy')}</span>
            <div className="flex gap-2">
              {(['Date', 'Title', 'Type'] as SortType[]).map((sort) => (
                <button
                  key={sort}
                  onClick={() => setActiveSort(sort)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    activeSort === sort
                      ? 'bg-[rgb(230,168,77)] text-white'
                      : 'bg-white dark:bg-stone-900 text-gray-700 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 border border-gray-200 dark:border-stone-700'
                  }`}
                >
                  {sort === 'Date' ? t('starred.sortDate') : sort === 'Title' ? t('starred.sortTitle') : t('starred.sortType')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white dark:bg-stone-900 rounded-lg p-4 sm:p-6 shadow-sm">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-stone-300 mb-2">{t('starred.total')}</p>
            <p className="text-2xl sm:text-3xl font-bold text-[rgb(230,168,77)]">{summaryCounts.total}</p>
          </div>
          <div className="bg-white dark:bg-stone-900 rounded-lg p-4 sm:p-6 shadow-sm">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-stone-300 mb-2">Text</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{summaryCounts.text}</p>
          </div>
          <div className="bg-white dark:bg-stone-900 rounded-lg p-4 sm:p-6 shadow-sm">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-stone-300 mb-2">Audio</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">{summaryCounts.audio}</p>
          </div>
          <div className="bg-white dark:bg-stone-900 rounded-lg p-4 sm:p-6 shadow-sm">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-stone-300 mb-2">Video</p>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600">{summaryCounts.video}</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors flex items-center gap-2 ${
                activeFilter === filter
                  ? 'bg-[rgb(112,130,56)] text-white'
                  : 'bg-white dark:bg-stone-900 text-gray-700 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 border border-gray-200 dark:border-stone-700'
              }`}
            >
              {filter === 'Text' && <FileText className="w-4 h-4" />}
              {filter === 'Audio' && <Music className="w-4 h-4" />}
              {filter === 'Video' && <Video className="w-4 h-4" />}
              <span>
                {filter} ({filterCounts[filter]})
              </span>
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
              <p className="text-gray-600 dark:text-stone-300">{t('starred.loading')}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && sortedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-stone-900 rounded-lg">
            <div className="text-6xl mb-4">⭐</div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-stone-100 mb-2">{t('starred.empty')}</h3>
            <p className="text-gray-600 dark:text-stone-300 text-center mb-6 max-w-md">
              {searchQuery
                ? `No starred items match "${searchQuery}". Try a different search term.`
                : activeFilter !== 'All Starred'
                ? `No starred ${activeFilter.toLowerCase()} items found.`
                : "You haven't starred any items yet. Star items from your library to see them here."}
            </p>
            {!searchQuery && activeFilter === 'All Starred' && (
              <button
                onClick={() => router.push('/library')}
                className="px-6 py-3 bg-[rgb(112,130,56)] text-white rounded-lg font-medium hover:bg-[rgb(95,110,48)] transition-colors flex items-center gap-2"
              >
                <span>📚</span>
                <span>Go to Library</span>
              </button>
            )}
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
        {!loading && sortedItems.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {sortedItems.map((item) => (
              <ContentCard
                key={item.id}
                id={item.id}
                title={item.title}
                type={item.type}
                date={item.date}
                description={item.description}
                isStarred={item.isStarred}
                onView={() => handleView(item.id)}
                onListen={item.type === 'Text' ? () => handleListen(item.id) : undefined}
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
                onUnstar={() => handleStar(item.id, item.isStarred)}
                onShare={() => console.log('Share', item.id)}
                viewLabel="Open"
              />
            ))}
          </div>
        )}

        {/* Floating Action Button */}
        <button
          onClick={() => router.push('/journals')}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[rgb(230,168,77)] text-white rounded-full shadow-lg hover:bg-[rgb(220,158,67)] transition-colors flex items-center justify-center z-10"
          aria-label="Create new journal"
        >
          <span className="text-2xl">ॐ</span>
        </button>
        <VideoPromptGuidelinesModal
          open={showPromptTips}
          onClose={() => setShowPromptTips(false)}
        />
      </div>
    </DashboardLayout>
  );
}

