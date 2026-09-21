import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import {
  acceptIdeaApplication,
  addBrainstormEntry,
  applyToRole,
  createBrainstormSpace,
  createIdea,
  generateBrainstormEntryVideo,
  getBrainstormSpace,
  getBrainstormSpaces,
  getBrainstormVideoJob,
  getFileUrl,
  getFriends,
  getIdea,
  getIdeaApplications,
  getIdeas,
  promoteBrainstormSpaceToIdea,
  rejectIdeaApplication,
  uploadAsset,
  voteBrainstormEntry,
  type BrainstormEntryItem,
  type BrainstormSpace,
  type FriendListItem,
  type IdeaApplication,
  type IdeaListItem,
  type IdeaVisibility,
} from '../../api';
import { Banner, Chip, EmptyState, LoadingState, OutlineButton, PrimaryButton, TextField, screenPad } from '../../components/ui';
import { useAuth } from '../../auth/AuthContext';
import { useNavigation } from '../../navigation';
import { colors } from '../../theme';

export function IdeasScreen() {
  const { push } = useNavigation();
  const [ideas, setIdeas] = useState<IdeaListItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getIdeas()
      .then(setIdeas)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load ideas'))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => Array.from(new Set(ideas.map((i) => i.category))).sort(), [ideas]);
  const filtered = ideas.filter((idea) => {
    if (category && idea.category !== category) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return idea.title.toLowerCase().includes(q) || idea.description.toLowerCase().includes(q) || idea.tags.some((t) => t.toLowerCase().includes(q));
  });

  return (
    <ScrollView contentContainerStyle={[screenPad, { backgroundColor: colors.ideasBg }]} keyboardShouldPersistTaps="handled">
<View style={{ marginBottom: 12 }}><PrimaryButton label="Post an idea" onPress={() => push({ name: 'idea-new' })} /></View>
      <TextField value={search} onChangeText={setSearch} placeholder="Search ideas..." />
      <View style={styles.wrap}>
        <Chip label="All categories" active={!category} onPress={() => setCategory('')} />
        {categories.map((c) => (
          <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>
      {error ? <Banner message={error} /> : null}
      {loading ? <LoadingState /> : null}
      {!loading && filtered.length === 0 ? <EmptyState emoji="💡" title="No ideas yet" body="No ideas match your search yet." /> : null}
      {filtered.map((idea) => {
        const openRoles = idea.roles.filter((r) => !r.filled);
        return (
          <Pressable key={idea._id} onPress={() => push({ name: 'idea', id: idea._id })} style={styles.ideaCard}>
            <Text style={styles.cat}>{idea.category}</Text>
            <Text style={styles.title}>{idea.title}</Text>
            <Text style={styles.body} numberOfLines={2}>{idea.description}</Text>
            <Text style={styles.meta}>Posted by {idea.creator.firstName} {idea.creator.lastName}</Text>
            {openRoles.length > 0 ? <Text style={styles.meta}>{openRoles.length} spots open</Text> : <Text style={styles.meta}>Team full</Text>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function NewIdeaScreen() {
  const { replace } = useNavigation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<IdeaVisibility>('all');
  const [roles, setRoles] = useState(['']);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const idea = await createIdea({
        title,
        description,
        category,
        visibility,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        roles: roles.filter((r) => r.trim()).map((role) => ({ title: role.trim() })),
      });
      replace({ name: 'idea', id: idea._id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post idea');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={screenPad} keyboardShouldPersistTaps="handled">

      {error ? <Banner message={error} /> : null}
      <TextField label="Title" value={title} onChangeText={setTitle} />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline style={{ minHeight: 120, textAlignVertical: 'top' }} />
      <TextField label="Category" value={category} onChangeText={setCategory} />
      <TextField label="Tags (comma separated)" value={tags} onChangeText={setTags} />
      <Text style={styles.section}>Who can see this</Text>
      <View style={styles.wrap}>
        <Chip label="Everyone" active={visibility === 'all'} onPress={() => setVisibility('all')} />
        <Chip label="My university only" active={visibility === 'university'} onPress={() => setVisibility('university')} />
      </View>
      <Text style={styles.section}>Open roles</Text>
      {roles.map((role, index) => (
        <TextField key={index} value={role} onChangeText={(value) => setRoles((prev) => prev.map((r, i) => i === index ? value : r))} placeholder="Role title, e.g. UI/UX Designer" />
      ))}
      <OutlineButton label="Add role" onPress={() => setRoles((prev) => [...prev, ''])} />
      <View style={{ height: 12 }} />
      <PrimaryButton label={saving ? 'Posting...' : 'Post idea'} onPress={() => void submit()} loading={saving} />
    </ScrollView>
  );
}

export function IdeaDetailScreen({ id }: { id: string }) {
  const { push } = useNavigation();
  const { user } = useAuth();
  const [idea, setIdea] = useState<IdeaListItem | null>(null);
  const [apps, setApps] = useState<IdeaApplication[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    const data = await getIdea(id);
    setIdea(data);
    if (user?.id === data.creator._id) {
      setApps(await getIdeaApplications(id));
    }
    const spaces = await getBrainstormSpaces();
    const space = spaces.find((s) => s.ideaId === id);
    setWorkspaceId(space?._id ?? null);
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load idea'));
  }, [id]);

  const isCreator = user?.id === idea?.creator._id;

  return (
    <ScrollView contentContainerStyle={screenPad}>
      {error ? <Banner message={error} /> : null}
      <Text style={styles.cat}>{idea?.category}</Text>
      <Text style={styles.title}>{idea?.title}</Text>
      <Text style={styles.body}>{idea?.description}</Text>
      <Text style={styles.meta}>Posted by {idea?.creator.firstName} {idea?.creator.lastName}</Text>
      {workspaceId ? (
        <View style={{ marginVertical: 12 }}>
          <PrimaryButton label="Open workspace" onPress={() => push({ name: 'brainstorm-space', id: workspaceId })} />
        </View>
      ) : null}
      <Text style={styles.section}>Roles</Text>
      {idea?.roles.map((role, index) => (
        <View key={`${role.title}-${index}`} style={styles.card}>
          <Text style={styles.title}>{role.title} {role.filled ? '· Filled' : ''}</Text>
          {!isCreator && !role.filled ? (
            <OutlineButton label="Apply" onPress={() => void applyToRole(id, index).then(load)} />
          ) : null}
        </View>
      ))}
      {isCreator ? (
        <>
          <Text style={styles.section}>Applicants</Text>
          {apps.length === 0 ? <Text style={styles.meta}>No applicants yet</Text> : null}
          {apps.map((app) => (
            <View key={app._id} style={styles.card}>
              <Text style={styles.title}>{app.applicant.firstName} {app.applicant.lastName} · {app.roleTitle || 'Role'}</Text>
              {app.status === 'pending' ? (
                <View style={styles.wrap}>
                  <OutlineButton label="Accept" onPress={() => void acceptIdeaApplication(app._id).then(load)} />
                  <OutlineButton label="Reject" onPress={() => void rejectIdeaApplication(app._id).then(load)} />
                </View>
              ) : <Text style={styles.meta}>{app.status}</Text>}
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

export function BrainstormScreen() {
  const { push } = useNavigation();
  const [spaces, setSpaces] = useState<BrainstormSpace[]>([]);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const spaceData = await getBrainstormSpaces();
      setSpaces(Array.isArray(spaceData) ? spaceData : []);
    } catch (err) {
      setSpaces([]);
      setError(err instanceof Error ? err.message : 'Failed to load spaces');
    }
    try {
      const friendsRes = await getFriends();
      setFriends(friendsRes.data || []);
    } catch {
      setFriends([]);
    }
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load spaces')).finally(() => setLoading(false));
  }, []);

  const create = async () => {
    setCreating(true);
    try {
      const space = await createBrainstormSpace({ title, memberIds: selected });
      setShowNew(false);
      setTitle('');
      setSelected([]);
      push({ name: 'brainstorm-space', id: space._id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create space');
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={screenPad} keyboardShouldPersistTaps="handled">
<View style={{ marginBottom: 12 }}><PrimaryButton label="New space" onPress={() => setShowNew(true)} /></View>
      {error ? <Banner message={error} /> : null}
      {showNew ? (
        <View style={styles.card}>
          <TextField label="Space title" value={title} onChangeText={setTitle} />
          <Text style={styles.section}>Invite friends</Text>
          {friends.map((item) => (
            <Chip
              key={item.friend._id}
              label={`${item.friend.firstName} ${item.friend.lastName}`}
              active={selected.includes(item.friend._id)}
              onPress={() => setSelected((prev) => prev.includes(item.friend._id) ? prev.filter((id) => id !== item.friend._id) : [...prev, item.friend._id])}
            />
          ))}
          <View style={{ height: 12 }} />
          <PrimaryButton label={creating ? 'Creating...' : 'Create space'} onPress={() => void create()} loading={creating} />
        </View>
      ) : null}
      {loading ? <LoadingState /> : null}
      {!loading && spaces.length === 0 ? <EmptyState emoji="🧠" title="No spaces yet" body="You don't have any Brainstorm spaces yet." /> : null}
      {spaces.map((space) => (
        <Pressable key={space._id} onPress={() => push({ name: 'brainstorm-space', id: space._id })} style={styles.card}>
          <Text style={styles.title}>{space.title}</Text>
          <Text style={styles.meta}>{(space.memberIds?.length ?? 0)} members</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function BrainstormSpaceScreen({ id }: { id: string }) {
  const { back, push } = useNavigation();
  const [space, setSpace] = useState<BrainstormSpace | null>(null);
  const [entries, setEntries] = useState<BrainstormEntryItem[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [showPromote, setShowPromote] = useState(false);
  const [promoteDescription, setPromoteDescription] = useState('');
  const [promoteCategory, setPromoteCategory] = useState('');
  const [promoting, setPromoting] = useState(false);

  const load = async () => {
    const data = await getBrainstormSpace(id);
    setSpace(data?.space ?? null);
    setEntries(Array.isArray(data?.entries) ? data.entries : []);
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load space'));
  }, [id]);

  const postText = async () => {
    if (!text.trim()) return;
    setPosting(true);
    setError('');
    try {
      await addBrainstormEntry(id, { type: 'text', content: text.trim() });
      setText('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const pickMedia = async (kind: 'image' | 'video') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Media library permission is required to upload.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'video' ? ['videos'] : ['images'],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPosting(true);
    setError('');
    try {
      const uploaded = await uploadAsset(
        {
          uri: asset.uri,
          name: asset.fileName || (kind === 'video' ? 'video.mp4' : 'image.jpg'),
          type: asset.mimeType || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
        },
        kind
      );
      if (uploaded.data) {
        await addBrainstormEntry(id, { type: kind, content: uploaded.data.fileUrl });
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload');
    } finally {
      setPosting(false);
    }
  };

  const generateVideo = async (entryId: string) => {
    setGeneratingId(entryId);
    setError('');
    try {
      const job = await generateBrainstormEntryVideo(id, entryId);
      if (job.status === 'completed') {
        setGeneratingId(null);
        await load();
        return;
      }
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        const next = await getBrainstormVideoJob(id, job.id);
        if (next.status === 'completed') {
          setGeneratingId(null);
          await load();
          return;
        }
        if (next.status === 'failed') {
          setGeneratingId(null);
          setError(next.error || 'Video generation failed');
          return;
        }
      }
      setGeneratingId(null);
    } catch (err) {
      setGeneratingId(null);
      setError(err instanceof Error ? err.message : 'Failed to start video generation');
    }
  };

  const promote = async () => {
    if (!space) return;
    setPromoting(true);
    setError('');
    try {
      const result = await promoteBrainstormSpaceToIdea(id, {
        title: space.title,
        description: promoteDescription,
        category: promoteCategory,
      });
      setShowPromote(false);
      push({ name: 'idea', id: result.ideaId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote to idea');
    } finally {
      setPromoting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={screenPad} keyboardShouldPersistTaps="handled">
      {error ? <Banner message={error} /> : null}
      <View style={{ marginBottom: 12 }}>
        <OutlineButton
          label={space?.ideaId ? 'Open idea' : 'Promote to idea'}
          onPress={() => space?.ideaId ? push({ name: 'idea', id: space.ideaId }) : setShowPromote(true)}
        />
      </View>
      {showPromote ? (
        <View style={styles.card}>
          <Text style={styles.title}>Promote to Ideas Board</Text>
          <TextField label="Description" value={promoteDescription} onChangeText={setPromoteDescription} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
          <TextField label="Category" value={promoteCategory} onChangeText={setPromoteCategory} />
          <PrimaryButton label={promoting ? 'Promoting...' : 'Promote'} onPress={() => void promote()} loading={promoting} />
        </View>
      ) : null}
      {entries.length === 0 ? <Text style={styles.meta}>No entries yet. Be the first to share something.</Text> : null}
      {entries.map((entry) => {
        const url = entry.type !== 'text' ? getFileUrl(entry.content) : null;
        return (
          <View key={entry._id} style={styles.card}>
            <Text style={styles.meta}>{entry.author?.firstName} {entry.author?.lastName} · {entry.type}</Text>
            {entry.type === 'text' ? <Text style={styles.body}>{entry.content}</Text> : null}
            {entry.type === 'image' && url ? <Image source={{ uri: url }} style={styles.media} /> : null}
            {(entry.type === 'video' || entry.type === 'ai_video') && url ? (
              <OutlineButton label="Open video" onPress={() => void Linking.openURL(url)} />
            ) : null}
            <View style={styles.wrap}>
              <OutlineButton
                label={entry.votedByMe ? `Voted (${entry.voteCount})` : `Vote (${entry.voteCount})`}
                onPress={() => void voteBrainstormEntry(id, entry._id).then((res) => setEntries((prev) => prev.map((e) => e._id === entry._id ? { ...e, ...res } : e)))}
              />
              {entry.type === 'text' ? (
                <OutlineButton
                  label={generatingId === entry._id ? 'Generating...' : 'Generate video'}
                  onPress={() => void generateVideo(entry._id)}
                />
              ) : null}
            </View>
          </View>
        );
      })}
      <TextField value={text} onChangeText={setText} placeholder="Share a thought, question, or direction..." />
      <PrimaryButton label={posting ? 'Posting...' : 'Post'} onPress={() => void postText()} loading={posting} />
      <View style={{ height: 8 }} />
      <OutlineButton label="Add photo" onPress={() => void pickMedia('image')} />
      <View style={{ height: 8 }} />
      <OutlineButton label="Add video" onPress={() => void pickMedia('video')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  ideaCard: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 10 },
  cat: { color: colors.ideasPurple, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  title: { fontWeight: '700', color: colors.text, fontSize: 16 },
  body: { marginTop: 6, color: colors.ideasMuted, lineHeight: 20 },
  meta: { marginTop: 6, color: colors.textMuted, fontSize: 12 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 10 },
  back: { color: colors.olive, fontWeight: '700', marginBottom: 8 },
  section: { fontWeight: '700', marginBottom: 8, color: colors.text },
  media: { width: '100%', height: 180, borderRadius: 10, marginTop: 8 },
});
