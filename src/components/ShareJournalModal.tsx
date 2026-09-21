import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFriends, shareJournal, type ContributorRole, type FriendListItem } from '../api';
import { getInitials } from '../lib/format';
import { colors, radii } from '../theme';
import { Banner, Segmented } from './ui';

type Props = {
  visible: boolean;
  journalId: string | null;
  journalTitle?: string;
  onClose: () => void;
};

export function ShareJournalModal({ visible, journalId, journalTitle = 'Untitled', onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<ContributorRole>('viewer');
  const [loading, setLoading] = useState(false);
  const [sharingTo, setSharingTo] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setError('');
    setSuccess('');
    setRole('viewer');
    setLoading(true);
    getFriends()
      .then((res) => setFriends(res.data || []))
      .catch(() => setFriends([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (item) =>
        item.friend.firstName.toLowerCase().includes(q) ||
        item.friend.lastName.toLowerCase().includes(q) ||
        item.friend.email.toLowerCase().includes(q)
    );
  }, [friends, search]);

  const handleShare = async (friendId: string) => {
    if (!journalId) return;
    setSharingTo(friendId);
    setError('');
    try {
      await shareJournal(journalId, friendId, role);
      setSuccess('Shared');
      setTimeout(onClose, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share journal');
    } finally {
      setSharingTo(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close share sheet" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Share</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          <Text style={styles.sub} numberOfLines={1}>
            {journalTitle}
          </Text>
          <Segmented
            options={[
              { label: 'Viewer', value: 'viewer' },
              { label: 'Editor', value: 'editor' },
            ]}
            value={role}
            onChange={(next) => setRole(next as ContributorRole)}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search friends"
            placeholderTextColor={colors.placeholder}
            style={styles.search}
          />
          {error ? <Banner message={error} /> : null}
          {success ? <Banner message={success} tone="success" /> : null}
          {loading ? (
            <ActivityIndicator color={colors.olive} style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView style={styles.list}>
              {filtered.length === 0 ? (
                <Text style={styles.empty}>No friends to share with yet.</Text>
              ) : (
                filtered.map((item, index) => (
                  <Pressable
                    key={item._id}
                    onPress={() => void handleShare(item.friend._id)}
                    disabled={sharingTo !== null}
                    style={[styles.row, index === filtered.length - 1 && styles.rowLast]}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getInitials(item.friend.firstName, item.friend.lastName)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>
                        {item.friend.firstName} {item.friend.lastName}
                      </Text>
                      <Text style={styles.email}>{item.friend.email}</Text>
                    </View>
                    <Text style={styles.share}>
                      {sharingTo === item.friend._id ? '...' : 'Share'}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '82%',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.creamDeep,
    marginBottom: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  done: { color: colors.olive, fontWeight: '700', fontSize: 16 },
  sub: { marginTop: 4, marginBottom: 12, color: colors.textMuted, fontSize: 13 },
  search: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#C9C4B8',
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  list: { maxHeight: 360 },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowLast: { borderBottomWidth: 0 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '700' },
  name: { fontWeight: '700', color: colors.text },
  email: { fontSize: 12, color: colors.textMuted },
  share: { color: colors.olive, fontWeight: '700' },
});
