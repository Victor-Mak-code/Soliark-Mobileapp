import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { type AppRoute } from '../navigation';
import { colors } from '../theme';

export type MenuKey =
  | 'home'
  | 'library'
  | 'journals'
  | 'ideas'
  | 'brainstorm'
  | 'storyboards'
  | 'shared'
  | 'starred'
  | 'friends'
  | 'collaboration'
  | 'export'
  | 'subscription'
  | 'notifications'
  | 'settings';

const MENU_ITEMS: { key: MenuKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Home', icon: 'home-outline' },
  { key: 'library', label: 'My Library', icon: 'library-outline' },
  { key: 'journals', label: 'Journals', icon: 'document-text-outline' },
  { key: 'ideas', label: 'Ideas Board', icon: 'bulb-outline' },
  { key: 'brainstorm', label: 'Brainstorm', icon: 'sparkles-outline' },
  { key: 'storyboards', label: 'Storyboards', icon: 'grid-outline' },
  { key: 'shared', label: 'Shared with Me', icon: 'share-outline' },
  { key: 'starred', label: 'Starred', icon: 'star-outline' },
  { key: 'friends', label: 'Friends', icon: 'people-outline' },
  { key: 'collaboration', label: 'Collaboration', icon: 'person-add-outline' },
  { key: 'export', label: 'Export & Sharing', icon: 'download-outline' },
  { key: 'subscription', label: 'Subscription', icon: 'card-outline' },
  { key: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

export function routeFromMenu(key: MenuKey): AppRoute {
  return { name: key };
}

type Props = {
  visible: boolean;
  active?: string;
  unreadCount?: number;
  onClose: () => void;
  onNavigate: (key: MenuKey) => void;
  onReplayOnboarding: () => void;
};

export function NavigationMenu({
  visible,
  active,
  unreadCount = 0,
  onClose,
  onNavigate,
  onReplayOnboarding,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, signOut } = useAuth();
  const panelWidth = Math.min(300, Math.round(width * 0.86));
  const [presented, setPresented] = useState(visible);
  const translateX = useRef(new Animated.Value(-panelWidth)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPresented(true);
      translateX.setValue(-panelWidth);
      backdrop.setValue(0);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      return;
    }
    if (!presented) return;
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -panelWidth,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setPresented(false);
    });
  }, [visible, panelWidth, translateX, backdrop, presented]);

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Loading...';
  const initial = (user?.firstName?.charAt(0) ?? '?').toUpperCase();

  return (
    <Modal visible={presented} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close menu" />
        </Animated.View>
        <Animated.View
          style={[
            styles.panel,
            {
              width: panelWidth,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="camera" size={18} color={colors.white} />
            </View>
            <Text style={styles.brandName}>Soliark</Text>
          </View>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {MENU_ITEMS.map((item) => {
              const isActive = active === item.key;
              const showBadge = item.key === 'notifications' && unreadCount > 0;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    onNavigate(item.key);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  style={[styles.item, isActive && styles.itemActive]}
                >
                  <Ionicons name={item.icon} size={20} color={isActive ? colors.oliveDark : colors.text} />
                  <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>{item.label}</Text>
                  {showBadge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.footer}>
            <View style={styles.profile}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {user?.email ?? '...'}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => void signOut()} style={styles.signOut}>
              <Ionicons name="log-out-outline" size={16} color={colors.text} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
            <Pressable onPress={onReplayOnboarding}>
              <Text style={styles.replay}>Replay onboarding</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 18,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 18, fontWeight: '700', color: colors.text },
  list: { flex: 1, marginTop: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  itemActive: { backgroundColor: colors.oliveSoft },
  itemLabel: { flex: 1, fontSize: 16, color: colors.text },
  itemLabelActive: { color: colors.oliveDark, fontWeight: '700' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  footer: { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingHorizontal: 12, paddingTop: 12, gap: 10 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '700' },
  profileName: { fontWeight: '700', color: colors.text },
  profileEmail: { fontSize: 12, color: colors.textMuted },
  signOut: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  signOutText: { color: colors.text, fontWeight: '600' },
  replay: { fontSize: 13, fontWeight: '700', color: colors.oliveDark },
});
