import Ionicons from '@expo/vector-icons/Ionicons';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export function TtsBar({ text, onClose }: { text: string; onClose: () => void }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    Speech.speak(text, {
      onStart: () => setSpeaking(true),
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
    return () => {
      Speech.stop();
    };
  }, [text]);

  return (
    <View style={styles.bar}>
      <View style={styles.copy}>
        <Text style={styles.title}>Text-to-Speech</Text>
        <Text style={styles.status}>{speaking ? 'Reading...' : 'Paused'}</Text>
      </View>
      <Pressable
        onPress={() => {
          if (speaking) {
            Speech.stop();
            setSpeaking(false);
          } else {
            Speech.speak(text, {
              onStart: () => setSpeaking(true),
              onDone: () => setSpeaking(false),
            });
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={speaking ? 'Pause' : 'Play'}
        style={styles.iconBtn}
      >
        <Ionicons name={speaking ? 'pause' : 'play'} size={18} color={colors.olive} />
      </Pressable>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.iconBtn}>
        <Ionicons name="close" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  copy: { flex: 1 },
  title: { fontWeight: '700', color: colors.text },
  status: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
});
