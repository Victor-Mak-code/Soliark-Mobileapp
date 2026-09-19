import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';

import {
  changePassword,
  confirmEmailChange,
  getFileUrl,
  getJournals,
  requestEmailChange,
  resendEmailChangeOtp,
  type Journal,
} from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { Banner, Chip, EmptyState, OutlineButton, PrimaryButton, TextField, screenPad } from '../../components/ui';
import { canCreateVideoFromJournal, formatDate, htmlToPlainText, mapJournalType } from '../../lib/format';
import { useNavigation } from '../../navigation';
import { colors } from '../../theme';

const STORYBOARDS = [
  { id: 'summer-adventures', title: 'Summer Adventures', scenes: 8, duration: '2:45', tags: ['travel', 'adventure'] },
  { id: 'morning-routine', title: 'Morning Routine', scenes: 6, duration: '1:30', tags: ['lifestyle', 'routine'] },
  { id: 'city-life', title: 'City Life', scenes: 12, duration: '4:20', tags: ['urban', 'city'] },
  { id: 'nature-meditation', title: 'Nature Meditation', scenes: 6, duration: '3:15', tags: ['nature', 'peaceful'] },
  { id: 'creative-process', title: 'Creative Process', scenes: 10, duration: '3:45', tags: ['creative', 'art'] },
  { id: 'family-moments', title: 'Family Moments', scenes: 7, duration: '2:30', tags: ['family', 'love'] },
];

const EXTRA_STORAGE_KEY = 'settings-extra';

type SettingsTab = 'profile' | 'preferences' | 'notifications' | 'privacy' | 'account';

export function HomeScreen() {
  const { user } = useAuth();
  const { replace, push } = useNavigation();
  const [stats, setStats] = useState({ journals: 0, videos: 0, starred: 0 });

  useEffect(() => {
    getJournals()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setStats({
          journals: list.length,
          videos: list.filter((j) => j.type === 'video' || j.type === 'ai_video').length,
          starred: list.filter((j) => j.isStarred).length,
        });
      })
      .catch(() => undefined);
  }, []);

  return (
    <ScrollView contentContainerStyle={screenPad} showsVerticalScrollIndicator={false}>
      <Text style={styles.hello}>Hello{user?.firstName ? `, ${user.firstName}` : ''}</Text>
      <Text style={styles.helloSub}>What would you like to capture?</Text>
      <View style={styles.grid}>
        {[
          { title: 'Write', sub: 'Journal', icon: 'create-outline' as const, route: { name: 'journals' as const, mode: 'write' as const } },
          { title: 'Upload', sub: 'Photo or doc', icon: 'cloud-upload-outline' as const, route: { name: 'journals' as const, mode: 'upload' as const } },
          { title: 'Record', sub: 'Voice note', icon: 'mic-outline' as const, route: { name: 'journals' as const, mode: 'voice' as const } },
          { title: 'Boards', sub: 'Storyboards', icon: 'grid-outline' as const, route: { name: 'storyboards' as const } },
        ].map((item) => (
          <Pressable key={item.title} onPress={() => push(item.route)} style={styles.tile}>
            <View style={styles.tileIcon}>
              <Ionicons name={item.icon} size={22} color={colors.oliveDark} />
            </View>
            <Text style={styles.tileTitle}>{item.title}</Text>
            <Text style={styles.meta}>{item.sub}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.stats}>
        <Stat value={String(stats.journals)} label="Journals" />
        <Stat value={String(stats.videos)} label="Videos" />
        <Stat value={String(stats.starred)} label="Starred" />
      </View>
      <Pressable onPress={() => replace({ name: 'subscription' })} style={styles.premium}>
        <Text style={styles.premiumTitle}>Go Premium</Text>
        <Text style={styles.heroBody}>HD video, unlimited transcription, and more voices</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.meta}>{label}</Text>
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.body}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.olive }} />
    </View>
  );
}

export function SettingsScreen() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  const [autoSave, setAutoSave] = useState(true);
  const [videoQuality, setVideoQuality] = useState('1080p');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [shareNotifs, setShareNotifs] = useState(true);
  const [collabNotifs, setCollabNotifs] = useState(true);
  const [visibility, setVisibility] = useState('friends');
  const [shareAnalytics, setShareAnalytics] = useState(false);
  const [searchIndexing, setSearchIndexing] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(EXTRA_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const extra = JSON.parse(raw) as Record<string, unknown>;
        if (typeof extra.location === 'string') setLocation(extra.location);
        if (typeof extra.website === 'string') setWebsite(extra.website);
        if (typeof extra.bio === 'string') setBio(extra.bio);
        if (typeof extra.theme === 'string') setTheme(extra.theme);
        if (typeof extra.language === 'string') setLanguage(extra.language);
        if (typeof extra.autoSave === 'boolean') setAutoSave(extra.autoSave);
        if (typeof extra.videoQuality === 'string') setVideoQuality(extra.videoQuality);
        if (typeof extra.emailNotifs === 'boolean') setEmailNotifs(extra.emailNotifs);
        if (typeof extra.pushNotifs === 'boolean') setPushNotifs(extra.pushNotifs);
        if (typeof extra.shareNotifs === 'boolean') setShareNotifs(extra.shareNotifs);
        if (typeof extra.collabNotifs === 'boolean') setCollabNotifs(extra.collabNotifs);
        if (typeof extra.visibility === 'string') setVisibility(extra.visibility);
        if (typeof extra.shareAnalytics === 'boolean') setShareAnalytics(extra.shareAnalytics);
        if (typeof extra.searchIndexing === 'boolean') setSearchIndexing(extra.searchIndexing);
        if (typeof extra.twoFactor === 'boolean') setTwoFactor(extra.twoFactor);
      } catch {
        // ignore invalid local settings
      }
    }).catch(() => undefined);
  }, []);

  const persistExtra = (patch: Record<string, unknown>) => {
    const next = {
      location, website, bio, theme, language, autoSave, videoQuality,
      emailNotifs, pushNotifs, shareNotifs, collabNotifs, visibility, shareAnalytics, searchIndexing, twoFactor,
      ...patch,
    };
    void AsyncStorage.setItem(EXTRA_STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <ScrollView contentContainerStyle={screenPad} keyboardShouldPersistTaps="handled">
      <View style={styles.wrap}>
        {(['profile', 'preferences', 'notifications', 'privacy', 'account'] as const).map((key) => (
          <Chip key={key} label={key[0].toUpperCase() + key.slice(1)} active={tab === key} onPress={() => setTab(key)} />
        ))}
      </View>
      {error ? <Banner message={error} /> : null}
      {success ? <Banner message={success} tone="success" /> : null}

      {tab === 'profile' ? (
        <View style={styles.card}>
          <Text style={styles.title}>Profile Information</Text>
          <Text style={styles.meta}>Full Name</Text>
          <Text style={styles.body}>{user ? `${user.firstName} ${user.lastName}` : 'Loading...'}</Text>
          <Text style={styles.meta}>Email</Text>
          <Text style={styles.body}>{user?.email}</Text>
          <TextField label="Location" value={location} onChangeText={(value) => { setLocation(value); persistExtra({ location: value }); }} />
          <TextField label="Website" value={website} onChangeText={(value) => { setWebsite(value); persistExtra({ website: value }); }} />
          <TextField label="Bio" value={bio} onChangeText={(value) => { setBio(value); persistExtra({ bio: value }); }} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
          <Text style={styles.hint}>Your sign-in email. Use Change email to update it.</Text>
        </View>
      ) : null}

      {tab === 'preferences' ? (
        <View style={styles.card}>
          <Text style={styles.title}>Preferences</Text>
          <Text style={styles.meta}>Theme</Text>
          <View style={styles.wrap}>
            <Chip label="Light" active={theme === 'light'} onPress={() => { setTheme('light'); persistExtra({ theme: 'light' }); }} />
            <Chip label="Dark" active={theme === 'dark'} onPress={() => { setTheme('dark'); persistExtra({ theme: 'dark' }); }} />
            <Chip label="System" active={theme === 'system'} onPress={() => { setTheme('system'); persistExtra({ theme: 'system' }); }} />
          </View>
          <Text style={styles.meta}>Language</Text>
          <View style={styles.wrap}>
            <Chip label="English" active={language === 'en'} onPress={() => { setLanguage('en'); persistExtra({ language: 'en' }); }} />
            <Chip label="Spanish" active={language === 'es'} onPress={() => { setLanguage('es'); persistExtra({ language: 'es' }); }} />
          </View>
          <Text style={styles.meta}>Default video quality</Text>
          <View style={styles.wrap}>
            {['720p', '1080p', '4K'].map((q) => (
              <Chip key={q} label={q} active={videoQuality === q} onPress={() => { setVideoQuality(q); persistExtra({ videoQuality: q }); }} />
            ))}
          </View>
          <ToggleRow label="Auto-save drafts" value={autoSave} onChange={(value) => { setAutoSave(value); persistExtra({ autoSave: value }); }} />
        </View>
      ) : null}

      {tab === 'notifications' ? (
        <View style={styles.card}>
          <Text style={styles.title}>Notifications</Text>
          <ToggleRow label="Email notifications" value={emailNotifs} onChange={(value) => { setEmailNotifs(value); persistExtra({ emailNotifs: value }); }} />
          <ToggleRow label="Push notifications" value={pushNotifs} onChange={(value) => { setPushNotifs(value); persistExtra({ pushNotifs: value }); }} />
          <ToggleRow label="Share alerts" value={shareNotifs} onChange={(value) => { setShareNotifs(value); persistExtra({ shareNotifs: value }); }} />
          <ToggleRow label="Collaboration alerts" value={collabNotifs} onChange={(value) => { setCollabNotifs(value); persistExtra({ collabNotifs: value }); }} />
        </View>
      ) : null}

      {tab === 'privacy' ? (
        <View style={styles.card}>
          <Text style={styles.title}>Privacy</Text>
          <Text style={styles.meta}>Profile visibility</Text>
          <View style={styles.wrap}>
            {['public', 'friends', 'private'].map((key) => (
              <Chip key={key} label={key[0].toUpperCase() + key.slice(1)} active={visibility === key} onPress={() => { setVisibility(key); persistExtra({ visibility: key }); }} />
            ))}
          </View>
          <ToggleRow label="Share analytics" value={shareAnalytics} onChange={(value) => { setShareAnalytics(value); persistExtra({ shareAnalytics: value }); }} />
          <ToggleRow label="Search indexing" value={searchIndexing} onChange={(value) => { setSearchIndexing(value); persistExtra({ searchIndexing: value }); }} />
          <ToggleRow label="Two-factor authentication" value={twoFactor} onChange={(value) => { setTwoFactor(value); persistExtra({ twoFactor: value }); }} />
        </View>
      ) : null}

      {tab === 'account' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.title}>Change password</Text>
            <TextField label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
            <TextField label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <TextField label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry />
            <PrimaryButton label="Update password" onPress={() => {
              setError('');
              if (newPassword !== confirm) { setError('Passwords do not match'); return; }
              void changePassword(currentPassword, newPassword)
                .then(() => setSuccess('Password updated.'))
                .catch((err) => setError(err instanceof Error ? err.message : 'Unable to update password'));
            }} />
          </View>
          <View style={styles.card}>
            <Text style={styles.title}>Change email</Text>
            <TextField label="Password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
            <TextField label="New email" value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" />
            <PrimaryButton label="Send code" onPress={() => void requestEmailChange(currentPassword, newEmail).then(() => setSuccess('Code sent')).catch((err) => setError(err instanceof Error ? err.message : 'Unable to change email'))} />
            <OutlineButton label="Resend code" onPress={() => void resendEmailChangeOtp().then(() => setSuccess('Code resent')).catch((err) => setError(err instanceof Error ? err.message : 'Failed to resend code'))} />
            <TextField label="Confirmation code" value={code} onChangeText={setCode} />
            <OutlineButton label="Confirm email" onPress={() => void confirmEmailChange(code).then(() => refreshUser()).then(() => setSuccess('Email updated.')).catch((err) => setError(err instanceof Error ? err.message : 'Invalid or expired code'))} />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

export function StoryboardsScreen() {
  const { push } = useNavigation();
  const [query, setQuery] = useState('');
  const [journals, setJournals] = useState<Journal[]>([]);
  const filtered = STORYBOARDS.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) || item.tags.some((t) => t.includes(query.toLowerCase())));

  useEffect(() => {
    getJournals()
      .then((res) => setJournals((Array.isArray(res.data) ? res.data : []).filter((j) => canCreateVideoFromJournal(j.type))))
      .catch(() => undefined);
  }, []);

  const useInVideo = (title: string) => {
    const first = journals[0];
    if (!first) {
      Alert.alert('Create a journal first', 'Write or upload a journal, then generate a video from it.');
      push({ name: 'journals' });
      return;
    }
    Alert.alert(`Use ${title}`, 'Open the Enhanced Video Creator for your latest journal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Create Video', onPress: () => push({ name: 'create-video', journalId: first._id }) },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={screenPad} keyboardShouldPersistTaps="handled">
      <Text style={styles.helloSub}>Pick a starting point for your next video.</Text>
      <TextField value={query} onChangeText={setQuery} placeholder="Search storyboards..." />
      {filtered.length === 0 ? <Text style={styles.meta}>No storyboards match your search.</Text> : null}
      {filtered.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>{item.scenes} scenes · {item.duration}</Text>
          <Text style={styles.hint}>{item.tags.join(', ')}</Text>
          <OutlineButton label="Use in Video" onPress={() => useInVideo(item.title)} />
        </View>
      ))}
    </ScrollView>
  );
}

function journalFileUrl(journal: Journal): string | null {
  const raw = journal.imageUrl || journal.videoUrl || journal.audioUrl || journal.documentUrl || journal.fileUrl;
  return raw ? getFileUrl(raw) : null;
}

export function ExportScreen() {
  const [format, setFormat] = useState<'text' | 'photo' | 'video'>('text');
  const [journals, setJournals] = useState<Journal[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getJournals()
      .then((res) => setJournals(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load journals'));
  }, []);

  const filtered = useMemo(() => {
    return journals.filter((journal) => {
      const type = mapJournalType(journal.type);
      if (format === 'text') return type === 'Text' || type === 'Doc';
      if (format === 'photo') return type === 'Image';
      return type === 'Video';
    });
  }, [journals, format]);

  const shareJournal = async (journal: Journal) => {
    const url = journalFileUrl(journal);
    const message = `${journal.title || 'Untitled Journal'}\n\n${htmlToPlainText(journal.content)}`;
    try {
      if (url && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(url);
        return;
      }
      await Share.share({ message: url ? `${message}\n${url}` : message, url: url || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to share journal');
    }
  };

  return (
    <ScrollView contentContainerStyle={screenPad}>
      <Text style={styles.helloSub}>Share journals as text, photos, or video.</Text>
      {error ? <Banner message={error} /> : null}
      <View style={styles.wrap}>
        <Chip label="Text" active={format === 'text'} onPress={() => setFormat('text')} />
        <Chip label="Photo" active={format === 'photo'} onPress={() => setFormat('photo')} />
        <Chip label="Video" active={format === 'video'} onPress={() => setFormat('video')} />
      </View>
      {filtered.length === 0 ? <EmptyState emoji="📤" title="Nothing to export" body="Create matching journals to export or share them here." /> : null}
      {filtered.map((journal) => {
        const url = journalFileUrl(journal);
        return (
          <View key={journal._id} style={styles.card}>
            <Text style={styles.title}>{journal.title || 'Untitled Journal'}</Text>
            <Text style={styles.meta}>{mapJournalType(journal.type)} · {formatDate(journal.createdAt)}</Text>
            <Text style={styles.body} numberOfLines={2}>{htmlToPlainText(journal.content)}</Text>
            <OutlineButton label="Share" onPress={() => void shareJournal(journal)} />
            {url ? <OutlineButton label="Open file" onPress={() => void Linking.openURL(url)} /> : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

export function SubscriptionScreen() {
  const [annual, setAnnual] = useState(false);
  return (
    <ScrollView contentContainerStyle={screenPad}>
      <Text style={styles.helloSub}>Start free, upgrade when you need more.</Text>
      <View style={styles.wrap}>
        <Chip label="Monthly" active={!annual} onPress={() => setAnnual(false)} />
        <Chip label="Annual · Save 20%" active={annual} onPress={() => setAnnual(true)} />
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Community</Text>
        <Text style={styles.statValue}>$0/month</Text>
        <Text style={styles.body}>Perfect for getting started with basic journal-to-video creation.</Text>
        <PrimaryButton label="Get Started Free" onPress={() => undefined} />
      </View>
      <View style={[styles.card, styles.popular]}>
        <Text style={styles.popularTag}>Most Popular</Text>
        <Text style={styles.title}>Professional</Text>
        <Text style={styles.statValue}>{annual ? '$20' : '$25'}/month</Text>
        <Text style={styles.body}>Advanced features for content creators and professionals.</Text>
        <PrimaryButton label="Upgrade Now" onPress={() => undefined} />
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Enterprise</Text>
        <Text style={styles.body}>Custom tools, collaboration, and support for teams.</Text>
        <OutlineButton label="Contact Sales" onPress={() => undefined} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hello: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  helloSub: { fontSize: 16, color: colors.textMuted, marginTop: 4, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  tile: { width: '48%', backgroundColor: colors.white, borderRadius: 18, padding: 16, minHeight: 118 },
  tileIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.oliveSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  tileTitle: { fontWeight: '700', fontSize: 16, color: colors.text },
  heroBody: { color: colors.textMuted, lineHeight: 20 },
  premium: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginTop: 16 },
  premiumTitle: { fontWeight: '800', color: colors.text, marginBottom: 4 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.olive },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 12, gap: 8 },
  popular: { borderColor: colors.orange, borderWidth: 2 },
  popularTag: { color: colors.orange, fontWeight: '800', fontSize: 12 },
  title: { fontWeight: '700', color: colors.text },
  body: { color: colors.textMuted, lineHeight: 20 },
  meta: { color: colors.textMuted, fontSize: 13 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
});
