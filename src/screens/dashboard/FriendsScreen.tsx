import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  acceptFriendRequest,
  blockFriend,
  getFriends,
  getPendingInvitations,
  inviteFriend,
  rejectFriendRequest,
  removeFriend,
  type FriendListItem,
  type PendingInvitationItem,
} from '../../api';
import { Banner, Chip, OutlineButton, PrimaryButton, TextField, screenPad } from '../../components/ui';
import { getInitials } from '../../lib/format';
import { colors } from '../../theme';

type Tab = 'friends' | 'pending';

export function FriendsScreen() {
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [pending, setPending] = useState<PendingInvitationItem[]>([]);
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const loadFriends = async () => {
    const res = await getFriends();
    setFriends(res.data || []);
  };
  const loadPending = async () => {
    const res = await getPendingInvitations();
    setPending(res.data || []);
  };

  useEffect(() => {
    void loadFriends().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load friends'));
    void loadPending().catch(() => undefined);
  }, []);

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

  const invite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await inviteFriend(email.trim());
      setSuccess(`Friend request sent to ${email.trim()}`);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={screenPad} keyboardShouldPersistTaps="handled">
      <View style={styles.tabs}>
        <Chip label={`Friends (${friends.length})`} active={tab === 'friends'} onPress={() => setTab('friends')} />
        <Chip label={`Pending (${pending.length})`} active={tab === 'pending'} onPress={() => setTab('pending')} />
      </View>
      {error ? <Banner message={error} /> : null}
      {success ? <Banner message={success} tone="success" /> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Invite Friends</Text>
        <TextField value={email} onChangeText={setEmail} placeholder="friend@email.com" autoCapitalize="none" keyboardType="email-address" />
        <PrimaryButton label={loading ? 'Sending...' : 'Send invite'} onPress={() => void invite()} loading={loading} />
      </View>

      {tab === 'friends' ? (
        <>
          <TextField value={search} onChangeText={setSearch} placeholder="Search friends" />
          {filtered.length === 0 ? <Text style={styles.empty}>No friends yet</Text> : null}
          {filtered.map((item) => (
            <View key={item._id} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(item.friend.firstName, item.friend.lastName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.friend.firstName} {item.friend.lastName}</Text>
                <Text style={styles.meta}>{item.friend.email}</Text>
              </View>
              <Pressable onPress={() => Alert.alert('Remove friend?', '', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => void removeFriend(item._id).then(loadFriends) },
              ])}>
                <Text style={styles.danger}>Remove</Text>
              </Pressable>
              <Pressable onPress={() => Alert.alert('Block this person?', 'They will be removed from your friends list.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Block', style: 'destructive', onPress: () => void blockFriend(item._id).then(loadFriends) },
              ])}>
                <Text style={styles.danger}>Block</Text>
              </Pressable>
            </View>
          ))}
        </>
      ) : (
        <>
          {pending.length === 0 ? <Text style={styles.empty}>No pending requests</Text> : null}
          {pending.map((item) => (
            <View key={item._id} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(item.requester.firstName, item.requester.lastName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.requester.firstName} {item.requester.lastName}</Text>
                <Text style={styles.meta}>Wants to be your friend</Text>
              </View>
              <OutlineButton label="Accept" onPress={() => void acceptFriendRequest(item._id).then(() => { void loadPending(); void loadFriends(); })} />
              <OutlineButton label="Reject" onPress={() => void rejectFriendRequest(item._id).then(() => { void loadPending(); })} />
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 16 },
  cardTitle: { fontWeight: '700', marginBottom: 8, color: colors.text },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: 16, padding: 12, marginBottom: 8 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.olive, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontWeight: '700' },
  name: { fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  danger: { color: colors.danger, fontWeight: '700' },
});
