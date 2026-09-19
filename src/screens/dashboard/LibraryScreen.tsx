import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { getJournal, getJournals, updateJournal, type Journal } from '../../api';
import { ContentCard } from '../../components/ContentCard';
import { ShareJournalModal } from '../../components/ShareJournalModal';
import { TtsBar } from '../../components/TtsBar';
import { Banner, Chip, EmptyState, LoadingState, screenPad } from '../../components/ui';
import { canCreateVideoFromJournal, formatDate, htmlToPlainText, mapJournalType } from '../../lib/format';
import { useNavigation } from '../../navigation';

const FILTERS = ['All Content', 'Write-ups', 'Docs', 'Images', 'Audio', 'Video'] as const;

export function LibraryScreen() {
  const { push } = useNavigation();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All Content');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ttsText, setTtsText] = useState<string | null>(null);
  const [share, setShare] = useState<{ id: string; title: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const response = await getJournals();
      setJournals(Array.isArray(response.data) ? response.data : []);
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
    const type = mapJournalType(journal.type);
    if (filter === 'All Content') return true;
    if (filter === 'Write-ups') return type === 'Text';
    if (filter === 'Docs') return type === 'Doc';
    if (filter === 'Images') return type === 'Image';
    if (filter === 'Audio') return type === 'Audio';
    return type === 'Video';
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
        {FILTERS.map((item) => (
          <Chip key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />
        ))}
      </ScrollView>
      {error ? <Banner message={error} /> : null}
      {ttsText ? <TtsBar text={ttsText} onClose={() => setTtsText(null)} /> : null}
      {loading ? <LoadingState label="Loading your journals..." /> : null}
      {!loading && filtered.length === 0 ? (
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
      ) : null}
      {filtered.map((journal) => {
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
            onCreateVideo={canCreateVideoFromJournal(journal.type) ? () => push({ name: 'create-video', journalId: journal._id }) : undefined}
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
});
