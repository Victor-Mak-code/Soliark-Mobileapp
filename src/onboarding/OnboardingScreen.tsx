import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';
import { CollaborateSlide, TransformSlide, WelcomeSlide } from './slides';

const SLIDES = [
  { key: 'welcome', component: WelcomeSlide },
  { key: 'transform', component: TransformSlide },
  { key: 'collaborate', component: CollaborateSlide },
] as const;

type OnboardingScreenProps = {
  onComplete: () => void;
};

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const [index, setIndex] = useState(0);

  const cardWidth = Math.min(windowWidth - spacing.screen * 2, 440);
  const isLast = index === SLIDES.length - 1;

  const goTo = (nextIndex: number) => {
    listRef.current?.scrollToOffset({
      offset: nextIndex * cardWidth,
      animated: true,
    });
    setIndex(nextIndex);
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    setIndex(Math.min(Math.max(next, 0), SLIDES.length - 1));
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visible = viewableItems[0];
    if (visible?.index != null) {
      setIndex(visible.index);
    }
  }).current;

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar style="light" />
      <View style={[styles.cardWrap, { width: cardWidth, marginBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.card}>
          <FlatList
            ref={listRef}
            style={styles.carousel}
            data={SLIDES}
            keyExtractor={(item) => item.key}
            horizontal
            pagingEnabled
            bounces={false}
            decelerationRate="fast"
            snapToInterval={cardWidth}
            snapToAlignment="start"
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
            getItemLayout={(_, itemIndex) => ({
              length: cardWidth,
              offset: cardWidth * itemIndex,
              index: itemIndex,
            })}
            renderItem={({ item }) => {
              const Slide = item.component;
              return (
                <View style={{ width: cardWidth, height: '100%', paddingHorizontal: spacing.card }}>
                  <Slide />
                </View>
              );
            }}
          />

          <View style={styles.footerWrap}>
            <View style={styles.divider} />
            <View style={styles.footer}>
              {isLast ? (
                <>
                  <PaginationDots activeIndex={index} />
                  <ActionButton label="Get Started" color={colors.terracotta} onPress={onComplete} />
                </>
              ) : (
                <>
                  <Pressable
                    onPress={onComplete}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Skip onboarding"
                    style={styles.skipHit}
                  >
                    <Text style={styles.skip}>Skip</Text>
                  </Pressable>
                  <View pointerEvents="none" style={styles.dotsCenter}>
                    <PaginationDots activeIndex={index} />
                  </View>
                  <ActionButton label="Next" color={colors.orange} onPress={() => goTo(index + 1)} />
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function PaginationDots({ activeIndex }: { activeIndex: number }) {
  return (
    <View
      style={styles.dots}
      accessibilityRole="adjustable"
      accessibilityLabel={`Slide ${activeIndex + 1} of ${SLIDES.length}`}
    >
      {SLIDES.map((slide, i) => (
        <View
          key={slide.key}
          style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

function ActionButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.actionButton, { backgroundColor: color, opacity: pressed ? 0.88 : 1 }]}
    >
      <Text style={styles.actionLabel}>{label}</Text>
      <Ionicons name="arrow-forward" size={16} color={colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    flex: 1,
    maxHeight: 760,
  },
  card: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: spacing.cardRadius,
    overflow: 'hidden',
    paddingTop: 28,
    paddingBottom: 18,
  },
  carousel: {
    flex: 1,
  },
  footerWrap: {
    paddingHorizontal: spacing.card,
    paddingTop: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginBottom: 16,
  },
  footer: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipHit: {
    minWidth: 52,
  },
  skip: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.orange,
  },
  dotInactive: {
    backgroundColor: colors.dotInactive,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  actionLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
