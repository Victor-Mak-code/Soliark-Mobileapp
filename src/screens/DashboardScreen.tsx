import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getUnreadNotificationsCount } from '../api';
import { NavigationMenu, routeFromMenu } from '../components/NavigationMenu';
import { isTabRoute, routeTitle, useNavigation } from '../navigation';
import { colors } from '../theme';
import { FriendsScreen } from './dashboard/FriendsScreen';
import { IdeaDetailScreen, IdeasScreen, NewIdeaScreen, BrainstormScreen, BrainstormSpaceScreen } from './dashboard/IdeasScreens';
import { CreateVideoScreen } from './dashboard/CreateVideoScreen';
import { JournalDetailScreen } from './dashboard/JournalDetailScreen';
import { JournalsScreen } from './dashboard/JournalsScreen';
import { LibraryScreen } from './dashboard/LibraryScreen';
import { ExportScreen, HomeScreen as WelcomeHome, SettingsScreen, StoryboardsScreen, SubscriptionScreen } from './dashboard/MiscScreens';
import { SharedItemScreen } from './dashboard/SharedItemScreen';
import {
  CollaborationDetailScreen,
  CollaborationScreen,
  NotificationsScreen,
  SharedScreen,
  StarredScreen,
} from './dashboard/SocialScreens';

export function DashboardScreen({ onReplayOnboarding }: { onReplayOnboarding: () => void }) {
  const insets = useSafeAreaInsets();
  const { route, replace, back, canGoBack } = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const activeTab = isTabRoute(route);
  const showTabs = activeTab !== null;

  useEffect(() => {
    getUnreadNotificationsCount().then(setUnread).catch(() => setUnread(0));
  }, [route]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={[styles.statusBand, { height: insets.top }]} />
      <View style={styles.header}>
        <Pressable
          onPress={() => (canGoBack ? back() : setMenuOpen(true))}
          accessibilityRole="button"
          accessibilityLabel={canGoBack ? 'Go back' : 'Open menu'}
          hitSlop={8}
          style={styles.headerBtn}
        >
          <Ionicons name={canGoBack ? 'chevron-back' : 'menu'} size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {routeTitle(route)}
        </Text>
        <Pressable
          onPress={() => replace({ name: 'notifications' })}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          hitSlop={8}
          style={styles.headerBtn}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.body}>{renderRoute(route)}</View>

      {showTabs ? (
        <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TabButton label="Home" icon="home" outline="home-outline" active={activeTab === 'home'} onPress={() => replace({ name: 'home' })} />
          <TabButton label="Library" icon="library" outline="library-outline" active={activeTab === 'library'} onPress={() => replace({ name: 'library' })} />
          <TabButton label="Create" icon="add-circle" outline="add-circle-outline" active={activeTab === 'journals'} onPress={() => replace({ name: 'journals' })} />
          <TabButton label="Friends" icon="people" outline="people-outline" active={activeTab === 'friends'} onPress={() => replace({ name: 'friends' })} />
        </View>
      ) : null}

      <NavigationMenu
        visible={menuOpen}
        active={route.name}
        unreadCount={unread}
        onClose={() => setMenuOpen(false)}
        onNavigate={(key) => replace(routeFromMenu(key))}
        onReplayOnboarding={() => {
          setMenuOpen(false);
          onReplayOnboarding();
        }}
      />
    </View>
  );
}

function renderRoute(route: ReturnType<typeof useNavigation>['route']) {
  switch (route.name) {
    case 'home':
      return <WelcomeHome />;
    case 'library':
      return <LibraryScreen />;
    case 'journals':
      return <JournalsScreen initialMode={route.mode} />;
    case 'journal':
      return <JournalDetailScreen id={route.id} />;
    case 'ideas':
      return <IdeasScreen />;
    case 'idea':
      return <IdeaDetailScreen id={route.id} />;
    case 'idea-new':
      return <NewIdeaScreen />;
    case 'brainstorm':
      return <BrainstormScreen />;
    case 'brainstorm-space':
      return <BrainstormSpaceScreen id={route.id} />;
    case 'friends':
      return <FriendsScreen />;
    case 'shared':
      return <SharedScreen />;
    case 'starred':
      return <StarredScreen />;
    case 'collaboration':
      return <CollaborationScreen />;
    case 'collaboration-journal':
      return <CollaborationDetailScreen journalId={route.journalId} />;
    case 'storyboards':
      return <StoryboardsScreen />;
    case 'export':
      return <ExportScreen />;
    case 'subscription':
      return <SubscriptionScreen />;
    case 'notifications':
      return <NotificationsScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'create-video':
      return <CreateVideoScreen journalId={route.journalId} />;
    case 'shared-item':
      return <SharedItemScreen id={route.id} />;
    default:
      return <LibraryScreen />;
  }
}

function TabButton({
  label,
  icon,
  outline,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  outline: keyof typeof Ionicons.glyphMap;
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
      <Ionicons name={active ? icon : outline} size={24} color={active ? colors.olive : colors.textMuted} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  statusBand: { backgroundColor: colors.cream },
  header: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
  body: { flex: 1 },
  tabBar: {
    backgroundColor: colors.tabBar,
    paddingTop: 6,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  tabButton: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  tabLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
  tabLabelActive: { color: colors.olive },
});
