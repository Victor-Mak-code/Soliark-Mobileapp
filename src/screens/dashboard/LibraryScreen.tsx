import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import {
  getCollaborationJournals,
  getJournal,
  getJournals,
  updateJournal,
  type CollaborationJournalListItem,
  type Journal,
} from '../../api';
import { ContentCard } from '../../components/ContentCard';
import { ShareJournalModal } from '../../components/ShareJournalModal';
import { TtsBar } from '../../components/TtsBar';
import { Banner, Chip, EmptyState, LoadingState, screenPad } from '../../components/ui';
import {
  canCreateVideoFromJournal,
  formatDate,
  formatTimeAgo,
  htmlToPlainText,
  mapJournalType,
} from '../../lib/format';
import { useNavigation } from '../../navigation';
import { colors } from '../../theme';

export const LIBRARY_FILTERS = [
  'All Content',
  'Write-ups',
  'Docs',
  'Images',
  'Audio',
  'Video',
  'Starred',
  'Collaboration',
] as const;

export type LibraryFilter = (typeof LIBRARY_FILTERS)[number];

export function LibraryScreen({ initialFilter = 'All Content' }: { initialFilter?: LibraryFilter } = {}) {
  const { push } = useNavigation();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [collaborations, setCollaborations] = useState<CollaborationJournalListItem[]>([]);
  const [filter, setFilter] = useState<LibraryFilter>(initialFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ttsText, setTtsText] = useState<string | null>(null);
  const [share, setShare] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (share) {
        setShare(null);
        return true;
      }
      if (filter !== initialFilter) {
        setFilter(initialFilter);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [filter, initialFilter, share]);

  const load = useCallback(async () => {
    try {
      setError('');
      const [journalsRes, collabRes] = await Promise.all([
        getJournals(),
        getCollaborationJournals().catch(() => ({ data: [] as CollaborationJournalListItem[] })),
      ]);
      setJournals(Array.isArray(journalsRes.data) ? journalsRes.data : []);
      setCollaborations(Array.isArray(collabRes.data) ? collabRes.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = journals.filter((journal) => {
    if (filter === 'Starred') return Boolean(journal.isStarred);
    const type = mapJournalType(journal.type);
    if (filter === 'All Content') return true;
    if (filter === 'Write-ups') return type === 'Text';
    if (filter === 'Docs') return type === 'Doc';
    if (filter === 'Images') return type === 'Image';
    if (filter === 'Audio') return type === 'Audio';
    if (filter === 'Video') return type === 'Video';
    return false;
  });

  const toggleStar = async (journal: Journal) => {
    setJournals((prev) =>
      prev.map((item) => (item._id === journal._id ? { ...item, isStarred: !item.isStarred } : item))
    );
    try {
      await updateJournal(journal._id, { isStarred: !journal.isStarred });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update journal');
      await load();
    }
  };

  const listen = async (id: string) => {
    try {
      const response = await getJournal(id);
      const journal = response.data as Journal;
      setTtsText(htmlToPlainText(journal.content));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prepare text for reading');
    }
  };

  return (
    <ScrollView contentContainerStyle={screenPad}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {LIBRARY_FILTERS.map((item) => (
          <Chip key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />
        ))}
      </ScrollView>
      {error ? <Banner message={error} /> : null}
      {ttsText ? <TtsBar text={ttsText} onClose={() => setTtsText(null)} /> : null}
      {loading ? (
        <LoadingState
          label={
            filter === 'Starred'
              ? 'Loading starred items...'
              : filter === 'Collaboration'
                ? 'Loading collaboration journals...'
                : 'Loading your journals...'
          }
        />
      ) : null}
      {!loading && filter === 'Collaboration' ? (
        collaborations.length === 0 ? (
          <EmptyState
            emoji="👤"
            title="No collaboration journals yet"
            body="When you create or are shared a journal that has at least one editor, it will appear here."
          />
        ) : (
          collaborations.map((item) => (
            <Pressable
              key={item._id}
              onPress={() => push({ name: 'collaboration-journal', journalId: item._id })}
              style={styles.collabCard}
            >
              <Text style={styles.collabTitle}>{item.title || 'Untitled'}</Text>
              <Text style={styles.collabMeta}>Updated {formatTimeAgo(item.updatedAt)}</Text>
            </Pressable>
          ))
        )
      ) : null}
      {!loading && filter !== 'Collaboration' && filtered.length === 0 ? (
        filter === 'Starred' ? (
          <EmptyState
            emoji="⭐"
            title="No starred items"
            body="Star journals from your library to find them here."
          />
        ) : (
          <EmptyState
            emoji="📚"
            title="No journals yet"
            body={
              filter === 'All Content'
                ? 'Start your journaling journey! Create your first entry to see it here.'
                : 'No matching items found. Try a different filter or create new content.'
            }
            actionLabel="Create Your First Journal"
            onAction={() => push({ name: 'journals' })}
          />
        )
      ) : null}
      {!loading &&
        filter !== 'Collaboration' &&
        filtered.map((journal) => {
          const type = mapJournalType(journal.type);
          return (
            <ContentCard
              key={journal._id}
              title={journal.title || 'Untitled Journal'}
              type={type}
              date={formatDate(journal.createdAt)}
              description={htmlToPlainText(journal.content)}
              isStarred={journal.isStarred}
              onView={() => push({ name: 'journal', id: journal._id })}
              onListen={type === 'Text' || type === 'Audio' ? () => void listen(journal._id) : undefined}
              onCreateVideo={
                canCreateVideoFromJournal(journal.type)
                  ? () => push({ name: 'create-video', journalId: journal._id })
                  : undefined
              }
              onStar={() => void toggleStar(journal)}
              onShare={() => setShare({ id: journal._id, title: journal.title || 'Untitled Journal' })}
            />
          );
        })}
      <ShareJournalModal
        visible={!!share}
        journalId={share?.id ?? null}
        journalTitle={share?.title}
        onClose={() => setShare(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  filters: { gap: 8, marginBottom: 16 },
  collabCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  collabTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  collabMeta: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
});
