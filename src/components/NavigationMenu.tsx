import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ComponentProps, useEffect, useRef, useState } from 'react';
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

import { colors, spacing } from '../theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type MenuDestination =
  | 'shared'
  | 'starred'
  | 'journals'
  | 'storyboards'
  | 'video'
  | 'export'
  | 'collaboration'
  | 'notifications';

type NavigationMenuProps = {
  visible: boolean;
  onClose: () => void;
  onNavigate: (destination: MenuDestination) => void;
  onSignOut: () => void;
  onReplayOnboarding: () => void;
};

const MENU_ITEMS: { key: MenuDestination; label: string; icon: IconName }[] = [
  { key: 'shared', label: 'Shared with Me', icon: 'tray-arrow-up' },
  { key: 'starred', label: 'Starred', icon: 'star-outline' },
  { key: 'journals', label: 'Journals', icon: 'file-document-outline' },
  { key: 'storyboards', label: 'Storyboards', icon: 'view-grid-outline' },
  { key: 'video', label: 'Video Creator', icon: 'video-outline' },
  { key: 'export', label: 'Export & Sharing', icon: 'export-variant' },
  { key: 'collaboration', label: 'Collaboration', icon: 'account-network-outline' },
  { key: 'notifications', label: 'Notifications', icon: 'bell-outline' },
];

export function NavigationMenu({
  visible,
  onClose,
  onNavigate,
  onSignOut,
  onReplayOnboarding,
}: NavigationMenuProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const panelWidth = Math.min(360, Math.round(windowWidth * 0.86));
  const [presented, setPresented] = useState(visible);
  const translateX = useRef(new Animated.Value(panelWidth)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPresented(true);
      translateX.setValue(panelWidth);
      backdrop.setValue(0);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!presented) {
      return;
    }

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: panelWidth,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setPresented(false);
      }
    });
  }, [visible, panelWidth, translateX, backdrop]);

  const choose = (destination: MenuDestination) => {
    onNavigate(destination);
    onClose();
  };

  return (
    <Modal
      visible={presented}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root} accessibilityViewIsModal>
        <Animated.View
          pointerEvents={visible ? 'auto' : 'none'}
          style={[styles.backdrop, { opacity: backdrop }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          />
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
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Menu</Text>
              <Text style={styles.subtitle}>Access journals, videos, and sharing</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={26} color={colors.white} />
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.profileName} numberOfLines={1}>
                John Doe
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                test@gmail.com
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => choose(item.key)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [styles.item, { opacity: pressed ? 0.55 : 1 }]}
              >
                <MaterialCommunityIcons name={item.icon} size={22} color={colors.text} />
                <Text style={styles.itemLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={() => {
                onClose();
                onReplayOnboarding();
              }}
              accessibilityRole="button"
              accessibilityLabel="Replay onboarding"
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={styles.footerLink}>Replay onboarding</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onClose();
                onSignOut();
              }}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={styles.footerLink}>Sign out</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 24, 18, 0.28)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.drawer,
    paddingHorizontal: spacing.screen,
    shadowColor: '#000000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    marginTop: 22,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.olive,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.oliveDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCopy: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  profileEmail: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textMuted,
  },
  list: {
    flex: 1,
    marginTop: 12,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  footer: {
    gap: 10,
    paddingTop: 8,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.oliveDark,
  },
});
