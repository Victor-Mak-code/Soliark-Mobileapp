import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  acceptFriendRequest,
  createComment,
  deleteNotification,
  getCollaborationJournals,
  getCollaborators,
  getComments,
  getJournal,
  getJournals,
  getNotifications,
  getSharedWithMe,
  markAllNotificationsRead,
  markNotificationRead,
  rejectFriendRequest,
  removeShared,
  toggleSharedStar,
  updateJournal,
  type CollaborationJournalListItem,
  type CommentItem,
  type CollaboratorItem,
  type Journal,
  type NotificationItem,
  type SharedJournalItem,
} from '../../api';
import { ContentCard } from '../../components/ContentCard';
import { JournalMedia } from '../../components/JournalMedia';
import { ShareJournalModal } from '../../components/ShareJournalModal';
import { Banner, Chip, EmptyState, LoadingState, OutlineButton, PrimaryButton, TextField, screenPad } from '../../components/ui';
import { formatDate, formatTimeAgo, htmlToPlainText, mapJournalType } from '../../lib/format';
import { useNavigation } from '../../navigation';
import { colors } from '../../theme';

export function SharedScreen() {
  const { push } = useNavigation();
  const [list, setList] = useState<SharedJournalItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSharedWithMe()
      .then((res) => setList(res.data || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load shared journals'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView contentContainerStyle={screenPad}>
      {error ? <Banner message={error} /> : null}
      {loading ? <LoadingState /> : null}
      {!loading && list.length === 0 ? <EmptyState emoji="📤" title="Nothing shared yet" body="Journals friends share with you will appear here." /> : null}
      {list.map((item) => (
        <View key={item._id} style={styles.card}>
          <Text style={styles.title}>{item.journal.title || 'Untitled'}</Text>
          <Text style={styles.meta}>From {item.sharedBy.firstName} {item.sharedBy.lastName} · {formatDate(item.sharedAt)} · {item.contributorRole}</Text>
          <Text style={styles.body} numberOfLines={2}>{htmlToPlainText(item.journal.content)}</Text>
          <View style={styles.row}>
            <OutlineButton label="View" onPress={() => push({ name: 'shared-item', id: item._id })} />
            <OutlineButton label={item.starredByRecipient ? 'Unstar' : 'Star'} onPress={() => void toggleSharedStar(item._id).then((res) => {
              if (res.data) setList((prev) => prev.map((row) => row._id === item._id ? res.data! : row));
            })} />
            <OutlineButton label="Remove" onPress={() => void removeShared(item._id).then(() => setList((prev) => prev.filter((row) => row._id !== item._id)))} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export function StarredScreen() {
  const { push } = useNavigation();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getJournals()
      .then((res) => setJournals((Array.isArray(res.data) ? res.data : []).filter((j) => j.isStarred)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load starred journals'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView contentContainerStyle={screenPad}>
      {error ? <Banner message={error} /> : null}
      {loading ? <LoadingState label="Loading starred items..." /> : null}
      {!loading && journals.length === 0 ? <EmptyState emoji="⭐" title="No starred items" body="Star journals from your library to find them here." /> : null}
      {journals.map((journal) => (
        <ContentCard
          key={journal._id}
          title={journal.title || 'Untitled Journal'}
          type={mapJournalType(journal.type)}
          date={formatDate(journal.createdAt)}
          description={htmlToPlainText(journal.content)}
          isStarred
          onView={() => push({ name: 'journal', id: journal._id })}
          onStar={() => void updateJournal(journal._id, { isStarred: false }).then(() => setJournals((prev) => prev.filter((j) => j._id !== journal._id)))}
        />
      ))}
    </ScrollView>
  );
}

export function NotificationsScreen() {
  const { push } = useNavigation();
  const [tab, setTab] = useState<'all' | 'unread' | 'share' | 'collaboration' | 'system'>('all');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = tab === 'unread' ? { unreadOnly: true } : tab === 'all' ? {} : { type: tab as 'share' | 'collaboration' | 'system' };
      const res = await getNotifications(params);
      setItems(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tab]);

  const openNotification = (item: NotificationItem) => {
    if (item.shareId) {
      push({ name: 'shared-item', id: item.shareId });
      return;
    }
    if (item.journalId) {
      push({ name: 'journal', id: item.journalId });
    }
  };

  return (
    <ScrollView contentContainerStyle={screenPad}>
      <View style={{ marginBottom: 12 }}>
        <OutlineButton label="Mark all read" onPress={() => void markAllNotificationsRead().then(load)} />
      </View>
      <View style={styles.wrap}>
        {(['all', 'unread', 'share', 'collaboration', 'system'] as const).map((key) => (
          <Chip key={key} label={key === 'share' ? 'Shares' : key[0].toUpperCase() + key.slice(1)} active={tab === key} onPress={() => setTab(key)} />
        ))}
      </View>
      {error ? <Banner message={error} /> : null}
      {loading ? <LoadingState /> : null}
      {!loading && items.length === 0 ? <EmptyState emoji="🔔" title="You're all caught up" body="New shares, invites, and comments will show up here." /> : null}
      {items.map((item) => (
        <View key={item._id} style={[styles.card, !item.read && styles.unread]}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.message}</Text>
          <Text style={styles.meta}>{formatTimeAgo(item.createdAt)}</Text>
          <View style={styles.row}>
            {item.shareId || item.journalId ? <OutlineButton label="Open" onPress={() => openNotification(item)} /> : null}
            {!item.read ? <OutlineButton label="Mark read" onPress={() => void markNotificationRead(item._id).then(load)} /> : null}
            {item.type === 'friend_invite' && item.friendshipId ? (
              <>
                <OutlineButton label="Accept" onPress={() => void acceptFriendRequest(item.friendshipId!).then(() => deleteNotification(item._id)).then(load)} />
                <OutlineButton label="Reject" onPress={() => void rejectFriendRequest(item.friendshipId!).then(() => deleteNotification(item._id)).then(load)} />
              </>
            ) : null}
            <OutlineButton label="Delete" onPress={() => void deleteNotification(item._id).then(load)} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export function CollaborationScreen() {
  const { push } = useNavigation();
  const [list, setList] = useState<CollaborationJournalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCollaborationJournals()
      .then((res) => setList(res.data || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load collaboration journals'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView contentContainerStyle={screenPad}>
      {error ? <Banner message={error} /> : null}
      {loading ? <LoadingState /> : null}
      {!loading && list.length === 0 ? (
        <EmptyState emoji="👤" title="No collaboration journals yet" body="When you create or are shared a journal that has at least one editor, it will appear here." />
      ) : null}
      {list.map((item) => (
        <Pressable key={item._id} onPress={() => push({ name: 'collaboration-journal', journalId: item._id })} style={styles.card}>
          <Text style={styles.title}>{item.title || 'Untitled'}</Text>
          <Text style={styles.meta}>Updated {formatTimeAgo(item.updatedAt)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function CollaborationDetailScreen({ journalId }: { journalId: string }) {
  
  const [journal, setJournal] = useState<Journal | null>(null);
  const [people, setPeople] = useState<CollaboratorItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const load = async () => {
    const [j, c, m] = await Promise.all([getJournal(journalId), getCollaborators(journalId), getComments(journalId)]);
    const data = j.data as Journal;
    setJournal(data);
    setTitle(data.title || '');
    setContent(data.content);
    setPeople(c.data || []);
    setComments(m.data || []);
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load collaboration'));
  }, [journalId]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await updateJournal(journalId, { title: title.trim() || undefined, content });
      setEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update journal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={screenPad} keyboardShouldPersistTaps="handled">
      
      {error ? <Banner message={error} /> : null}
      {journal ? <JournalMedia journal={journal} /> : null}
      {editing ? (
        <>
          <TextField label="Title" value={title} onChangeText={setTitle} />
          <TextField label="Content" value={content} onChangeText={setContent} multiline style={{ minHeight: 160, textAlignVertical: 'top' }} />
          <PrimaryButton label={saving ? 'Saving...' : 'Save'} onPress={() => void save()} loading={saving} />
        </>
      ) : (
        <Text style={styles.body}>{htmlToPlainText(journal?.content || '')}</Text>
      )}
      <View style={styles.row}>
        <OutlineButton label={editing ? 'Cancel' : 'Edit'} onPress={() => setEditing((v) => !v)} />
        <OutlineButton label="Share" onPress={() => setShareOpen(true)} />
      </View>
      <Text style={styles.section}>Collaborators</Text>
      {people.map((person) => (
        <Text key={person._id} style={styles.meta}>{person.firstName} {person.lastName} · {person.role}</Text>
      ))}
      <Text style={[styles.section, { marginTop: 16 }]}>Comments & Feedback</Text>
      {comments.length === 0 ? <Text style={styles.meta}>No comments yet.</Text> : null}
      {comments.map((comment) => (
        <View key={comment._id} style={styles.card}>
          <Text style={styles.title}>{comment.author.firstName} {comment.author.lastName}</Text>
          <Text style={styles.body}>{comment.content}</Text>
        </View>
      ))}
      <TextField value={text} onChangeText={setText} placeholder="Write a comment" />
      <PrimaryButton label="Post comment" onPress={() => {
        if (!text.trim()) return;
        void createComment(journalId, text).then(() => { setText(''); return load(); });
      }} />
      <ShareJournalModal visible={shareOpen} journalId={journalId} journalTitle={journal?.title} onClose={() => setShareOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 10 },
  unread: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  title: { fontWeight: '700', color: colors.text },
  body: { marginTop: 6, color: colors.textMuted },
  meta: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  back: { color: colors.olive, fontWeight: '700', marginBottom: 8 },
  section: { fontWeight: '700', color: colors.text, marginBottom: 8 },
});
