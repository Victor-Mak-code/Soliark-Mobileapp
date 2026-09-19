import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { colors, radii, shadows, spacing, type } from '../../theme';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.primary,
        { opacity: disabled || loading ? 0.5 : pressed ? 0.88 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.primaryLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

export function AmberButton({
  label,
  onPress,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.amber,
        { opacity: disabled ? 0.5 : pressed ? 0.88 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={colors.white} /> : null}
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function OutlineButton({
  label,
  onPress,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.outline,
        { opacity: disabled ? 0.5 : pressed ? 0.88 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={colors.text} /> : null}
      <Text style={styles.outlineLabel}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color = colors.text,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

export function TextField({
  label,
  ...props
}: TextInputProps & { label?: string }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.placeholder}
        {...props}
        style={[styles.input, props.multiline && styles.inputMultiline, props.style]}
      />
    </View>
  );
}

export function Banner({
  message,
  tone = 'error',
}: {
  message: string;
  tone?: 'error' | 'success';
}) {
  return (
    <View style={[styles.banner, tone === 'success' ? styles.bannerSuccess : styles.bannerError]}>
      <Text style={[styles.bannerText, tone === 'success' ? styles.successText : styles.errorText]}>
        {message}
      </Text>
    </View>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function EmptyState({
  emoji,
  title,
  body,
  actionLabel,
  onAction,
}: {
  emoji: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: 18, width: '100%' }}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.olive} size="large" />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  onPress,
  left,
  right,
  last,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  left?: ReactNode;
  right?: ReactNode;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.listRow, last && styles.listRowLast]}
    >
      {left}
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {subtitle ? <Text style={styles.listSub}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.placeholder} /> : null)}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: colors.olive,
    borderRadius: radii.pill,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  amber: {
    backgroundColor: colors.orange,
    borderRadius: radii.pill,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
  },
  outline: {
    backgroundColor: colors.oliveSoft,
    borderRadius: radii.pill,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
  },
  primaryLabel: {
    color: colors.white,
    fontSize: type.headline,
    fontWeight: '700',
  },
  outlineLabel: {
    color: colors.oliveDark,
    fontSize: type.callout,
    fontWeight: '700',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: type.caption,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: colors.cream,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: type.body,
    color: colors.text,
  },
  inputMultiline: {
    minHeight: 140,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  banner: {
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 12,
  },
  bannerError: {
    backgroundColor: colors.dangerSoft,
  },
  bannerSuccess: {
    backgroundColor: colors.successSoft,
  },
  bannerText: {
    fontSize: type.caption,
  },
  errorText: {
    color: colors.danger,
  },
  successText: {
    color: colors.success,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: type.largeTitle,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 4,
    fontSize: type.callout,
    lineHeight: 20,
    color: colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: type.title,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: 8,
    fontSize: type.callout,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
  },
  loading: {
    paddingVertical: 56,
    alignItems: 'center',
    gap: 12,
  },
  loadingLabel: {
    color: colors.textMuted,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.olive,
  },
  chipLabel: {
    fontSize: type.caption,
    fontWeight: '600',
    color: colors.text,
  },
  chipLabelActive: {
    color: colors.white,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.creamDeep,
    borderRadius: radii.md,
    padding: 3,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 11,
  },
  segmentActive: {
    backgroundColor: colors.white,
    ...shadows.card,
  },
  segmentLabel: {
    fontSize: type.caption,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentLabelActive: {
    color: colors.text,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  listTitle: {
    fontSize: type.body,
    fontWeight: '600',
    color: colors.text,
  },
  listSub: {
    marginTop: 2,
    fontSize: type.caption,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 16,
    ...shadows.card,
  },
});

export const screenPad = {
  paddingHorizontal: spacing.screen,
  paddingTop: 8,
  paddingBottom: 40,
};
