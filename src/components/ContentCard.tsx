import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows } from '../theme';

export type ContentType = 'Text' | 'Audio' | 'Video' | 'Image' | 'Doc';

type Props = {
  title: string;
  type: ContentType;
  date: string;
  description: string;
  isStarred: boolean;
  onView?: () => void;
  onListen?: () => void;
  onCreateVideo?: () => void;
  createVideoBusy?: boolean;
  createVideoStatus?: string;
  onStar?: () => void;
  onShare?: () => void;
};

const ICONS: Record<ContentType, keyof typeof Ionicons.glyphMap> = {
  Text: 'document-text',
  Doc: 'document',
  Image: 'image',
  Audio: 'volume-high',
  Video: 'videocam',
};

export function ContentCard({
  title,
  type,
  date,
  description,
  isStarred,
  onView,
  onListen,
  onCreateVideo,
  createVideoBusy,
  createVideoStatus,
  onStar,
  onShare,
}: Props) {
  return (
    <Pressable onPress={onView} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Ionicons name={ICONS[type]} size={20} color={colors.white} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {isStarred ? <Ionicons name="star" size={14} color="#EAB308" /> : null}
          </View>
          <Text style={styles.meta}>
            {type}  ·  {date}
          </Text>
          {description ? (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
      </View>
      <View style={styles.actions}>
        {onListen ? <Action icon="volume-medium-outline" label="Listen" onPress={onListen} /> : null}
        {onCreateVideo ? (
          <Action
            icon="videocam-outline"
            label={createVideoBusy ? 'Busy' : 'Video'}
            onPress={onCreateVideo}
            disabled={createVideoBusy}
          />
        ) : null}
        {onStar ? <Action icon={isStarred ? 'star' : 'star-outline'} label={isStarred ? 'Starred' : 'Star'} onPress={onStar} /> : null}
        {onShare ? <Action icon="share-outline" label="Share" onPress={onShare} /> : null}
      </View>
      {createVideoStatus ? <Text style={styles.status}>{createVideoStatus}</Text> : null}
    </Pressable>
  );
}

function Action({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, { opacity: disabled ? 0.45 : pressed ? 0.65 : 1 }]}
    >
      <Ionicons name={icon} size={16} color={colors.oliveDark} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 10,
    ...shadows.card,
  },
  pressed: { opacity: 0.92 },
  top: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textMuted,
  },
  description: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  actionLabel: {
    fontSize: 12,
    color: colors.oliveDark,
    fontWeight: '600',
  },
  status: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
});
