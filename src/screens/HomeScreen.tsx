import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuDestination, NavigationMenu } from '../components/NavigationMenu';
import { colors, spacing } from '../theme';

type TabKey = 'home' | 'library' | 'create' | 'friends';
type PageKey = TabKey | Exclude<MenuDestination, 'journals' | 'video' | 'collaboration'>;
type IoniconName = ComponentProps<typeof Ionicons>['name'];

type HomeScreenProps = {
  onReplayOnboarding: () => void;
  onSignOut: () => void;
};

export function HomeScreen({ onReplayOnboarding, onSignOut }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState<PageKey>('home');
  const [menuOpen, setMenuOpen] = useState(false);

  const openTab = (next: TabKey) => {
    setPage(next);
  };

  const openFromMenu = (destination: MenuDestination) => {
    if (destination === 'journals') {
      openTab('library');
      return;
    }
    if (destination === 'video') {
      openTab('create');
      return;
    }
    if (destination === 'collaboration') {
      openTab('friends');
      return;
    }
    setPage(destination);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" backgroundColor={colors.statusBar} />
      <View style={[styles.statusBand, { height: insets.top }]} />
      <View style={styles.accentTrack}>
        <View style={styles.accentBar} />
      </View>

      <View style={styles.header}>
        <View style={styles.brand}>
          <Image source={require('../../assets/jv-icon.png')} style={styles.logo} />
          <Text style={styles.brandLabel}>JV</Text>
        </View>
        <Pressable
          onPress={() => setMenuOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Ionicons name="menu" size={28} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {page === 'home' ? (
          <HomeFeed onStartCreating={() => openTab('create')} />
        ) : (
          <PlaceholderTab page={page} />
        )}
      </View>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TabButton
          label="Home"
          icon="home"
          active={page === 'home'}
          onPress={() => openTab('home')}
        />
        <TabButton
          label="My Library"
          icon="library-outline"
          active={page === 'library'}
          onPress={() => openTab('library')}
        />
        <TabButton
          label="Create"
          icon="add"
          active={page === 'create'}
          onPress={() => openTab('create')}
        />
        <TabButton
          label="Friends"
          icon="people-outline"
          active={page === 'friends'}
          onPress={() => openTab('friends')}
        />
        <Pressable
          onPress={() => openTab('create')}
          accessibilityRole="button"
          accessibilityLabel="Quick create"
          style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.88 : 1 }]}
        >
          <Ionicons name="sparkles" size={22} color={colors.white} />
        </Pressable>
      </View>

      <NavigationMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={openFromMenu}
        onSignOut={onSignOut}
        onReplayOnboarding={onReplayOnboarding}
      />
    </View>
  );
}

const QUICK_START_ITEMS: {
  key: string;
  title: string;
  subtitle: string;
  icon: IoniconName;
  backgroundColor: string;
}[] = [
  {
    key: 'write',
    title: 'Write Journal',
    subtitle: 'Start writing your thoughts',
    icon: 'document-text-outline',
    backgroundColor: colors.oliveDark,
  },
  {
    key: 'upload',
    title: 'Upload File',
    subtitle: 'Import existing content',
    icon: 'cloud-upload-outline',
    backgroundColor: colors.sage,
  },
  {
    key: 'record',
    title: 'Record Audio',
    subtitle: 'Voice record your journal',
    icon: 'mic-outline',
    backgroundColor: colors.terracotta,
  },
  {
    key: 'storyboard',
    title: 'Generate Storyboard',
    subtitle: 'Create visual storyboards',
    icon: 'grid-outline',
    backgroundColor: colors.orange,
  },
  {
    key: 'video',
    title: 'Create Video',
    subtitle: 'Turn your story into a video',
    icon: 'play-outline',
    backgroundColor: colors.shareBlue,
  },
];

function HomeFeed({ onStartCreating }: { onStartCreating: () => void }) {
  return (
    <ScrollView
      style={styles.feed}
      contentContainerStyle={styles.feedContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.greeting}>Welcome back!</Text>
      <Text style={styles.tagline}>Ready to transform your thoughts into beautiful videos?</Text>

      <View style={styles.featureCard}>
        <Image
          source={require('../../assets/onboarding/journal.jpg')}
          style={styles.featureImage}
          resizeMode="cover"
        />
        <View style={styles.featureCopy}>
          <Text style={styles.featureTitle}>Transform Your Stories</Text>
          <Text style={styles.featureDescription}>
            From written words to compelling videos - let AI bring your journal entries to life
          </Text>
          <Pressable
            onPress={onStartCreating}
            accessibilityRole="button"
            accessibilityLabel="Start Creating"
            style={({ pressed }) => [styles.startButton, { opacity: pressed ? 0.88 : 1 }]}
          >
            <Ionicons name="play" size={16} color={colors.white} />
            <Text style={styles.startLabel}>Start Creating</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.premiumCard}>
        <View style={styles.premiumBadge}>
          <FontAwesome5 name="crown" size={13} color={colors.white} />
        </View>
        <View style={styles.premiumCopy}>
          <Text style={styles.premiumTitle}>Unlock Premium Features</Text>
          <Text style={styles.premiumSubtitle}>
            HD videos, unlimited transcription, and advanced AI voices
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Upgrade"
          style={({ pressed }) => [styles.upgradeButton, { opacity: pressed ? 0.88 : 1 }]}
        >
          <Ionicons name="card-outline" size={15} color={colors.white} />
          <Text style={styles.upgradeLabel}>Upgrade</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={onStartCreating}
        accessibilityRole="button"
        accessibilityLabel="Create Video"
        style={({ pressed }) => [styles.modeCard, { opacity: pressed ? 0.92 : 1 }]}
      >
        <View style={[styles.modeIcon, { backgroundColor: colors.cameraSoft }]}>
          <Ionicons name="videocam-outline" size={22} color={colors.cameraBrown} />
        </View>
        <Text style={styles.modeTitle}>Create Video</Text>
        <Text style={styles.modeSubtitle}>Transform journals to videos</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Quick Start</Text>
      {QUICK_START_ITEMS.map((item) => (
        <Pressable
          key={item.key}
          onPress={item.key === 'write' || item.key === 'video' ? onStartCreating : undefined}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          style={({ pressed }) => [styles.quickCard, { opacity: pressed ? 0.88 : 1 }]}
        >
          <View style={[styles.quickIcon, { backgroundColor: item.backgroundColor }]}>
            <Ionicons name={item.icon} size={18} color={colors.white} />
          </View>
          <View style={styles.quickCopy}>
            <Text style={styles.quickTitle}>{item.title}</Text>
            <Text style={styles.quickSubtitle}>{item.subtitle}</Text>
          </View>
        </Pressable>
      ))}

      <View style={styles.statsRow}>
        <StatCard value="12" label={'Journal\nEntries'} color={colors.oliveDark} />
        <StatCard value="8" label={'Videos\nCreated'} color={colors.sage} />
        <StatCard value="24" label={'Items\nShared'} color={colors.terracotta} />
      </View>
    </ScrollView>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PlaceholderTab({ page }: { page: Exclude<PageKey, 'home'> }) {
  const copy = {
    library: {
      title: 'My Library',
      body: 'Your finished videos will live here once you start creating.',
    },
    create: {
      title: 'Create',
      body: 'Turn a journal entry into a narrated video. This workspace is coming next.',
    },
    friends: {
      title: 'Friends',
      body: 'Share creations and collaborate with people you trust.',
    },
    shared: {
      title: 'Shared with Me',
      body: 'Journals and videos others have shared with you will appear here.',
    },
    starred: {
      title: 'Starred',
      body: 'Save journals, storyboards, and videos here so they are easy to find later.',
    },
    storyboards: {
      title: 'Storyboards',
      body: 'Your generated storyboards will live here once you start creating.',
    },
    export: {
      title: 'Export & Sharing',
      body: 'Export finished videos and share them with friends and collaborators.',
    },
    notifications: {
      title: 'Notifications',
      body: 'Updates about shares, comments, and collaboration will show up here.',
    },
  }[page];

  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>{copy.title}</Text>
      <Text style={styles.placeholderBody}>{copy.body}</Text>
    </View>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IoniconName;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={styles.tabButton}
    >
      <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
        <Ionicons name={icon} size={20} color={active ? colors.white : colors.text} />
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  statusBand: {
    backgroundColor: colors.statusBar,
  },
  accentTrack: {
    height: 5,
    backgroundColor: colors.cream,
  },
  accentBar: {
    width: '45%',
    height: 5,
    marginLeft: spacing.screen,
    backgroundColor: colors.orange,
    borderRadius: 999,
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.screen,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    paddingTop: 12,
    paddingBottom: 28,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  tagline: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  featureCard: {
    marginTop: 22,
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.olive,
    overflow: 'hidden',
  },
  featureImage: {
    width: '100%',
    height: 190,
  },
  featureCopy: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  featureDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  startButton: {
    marginTop: 16,
    backgroundColor: colors.orange,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  premiumCard: {
    marginTop: 18,
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.premiumBorder,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  premiumBadge: {
    width: 34,
    height: 52,
    borderRadius: 17,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCopy: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  premiumSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  upgradeButton: {
    backgroundColor: colors.orange,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  upgradeLabel: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  modeCard: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modeSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  quickCard: {
    marginBottom: 10,
    backgroundColor: '#FBFAF4',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCopy: {
    flex: 1,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  quickSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textMuted,
  },
  statsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.oliveDark,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  placeholderTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  placeholderBody: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  tabBar: {
    backgroundColor: colors.creamDeep,
    paddingTop: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tabIconWrap: {
    width: 42,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: colors.terracotta,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.terracotta,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginBottom: 6,
  },
});
