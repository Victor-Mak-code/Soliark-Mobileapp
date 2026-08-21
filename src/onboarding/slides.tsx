import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { FilledIconCircle, OutlinedIconCircle } from './IconCircles';

export function WelcomeSlide() {
  return (
    <View style={styles.slide}>
      <FilledIconCircle name="document-text-outline" backgroundColor={colors.oliveDark} />
      <Text style={styles.title}>Welcome to JournalVideo</Text>
      <Text style={styles.description}>
        Transform your thoughts and journal entries into beautiful, shareable videos with AI
      </Text>
      <Image
        source={require('../../assets/onboarding/journal.jpg')}
        style={styles.heroImage}
        resizeMode="cover"
      />
    </View>
  );
}

export function TransformSlide() {
  return (
    <View style={styles.slide}>
      <View style={styles.flowRow}>
        <OutlinedIconCircle name="document-text-outline" color={colors.oliveDark} />
        <Ionicons name="arrow-forward" size={18} color={colors.text} style={styles.flowArrow} />
        <OutlinedIconCircle name="volume-medium-outline" color={colors.sage} />
        <Ionicons name="arrow-forward" size={18} color={colors.text} style={styles.flowArrow} />
        <OutlinedIconCircle name="videocam-outline" color={colors.terracotta} />
      </View>

      <Text style={styles.title}>AI-Powered Transformation</Text>
      <Text style={styles.description}>
        Your written thoughts become narrated audio, then transform into engaging videos with
        AI-generated visuals and characters
      </Text>

      <View style={styles.featureRow}>
        <FeatureItem name="document-text-outline" color={colors.oliveDark} label="Write" />
        <FeatureItem name="mic-outline" color={colors.sage} label="Listen" />
        <FeatureItem name="videocam-outline" color={colors.terracotta} label="Watch" />
      </View>
    </View>
  );
}

export function CollaborateSlide() {
  return (
    <View style={styles.slide}>
      <FilledIconCircle name="people-outline" backgroundColor={colors.terracotta} />
      <Text style={styles.title}>Share & Collaborate</Text>
      <Text style={styles.description}>
        Share your creations with friends, collaborate on projects, and discover content from your
        community
      </Text>
      <Image
        source={require('../../assets/onboarding/community.jpg')}
        style={[styles.heroImage, styles.heroImagePlain]}
        resizeMode="cover"
      />
      <View style={styles.miniIconRow}>
        <Ionicons name="share-social-outline" size={22} color={colors.shareBlue} />
        <Ionicons name="people-outline" size={22} color={colors.sage} />
        <Ionicons name="videocam-outline" size={22} color={colors.terracotta} />
      </View>
    </View>
  );
}

function FeatureItem({
  name,
  color,
  label,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
}) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={name} size={28} color={color} />
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  title: {
    marginTop: 16,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  description: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  heroImage: {
    marginTop: 18,
    width: '100%',
    height: 132,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.oliveDark,
  },
  heroImagePlain: {
    borderWidth: 0,
    height: 118,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  flowArrow: {
    marginHorizontal: 8,
  },
  featureRow: {
    marginTop: 24,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  miniIconRow: {
    marginTop: 12,
    width: '72%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
