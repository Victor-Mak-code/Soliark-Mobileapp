import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer } from 'expo-audio';

import { getFileUrl } from '../api';
import { colors } from '../theme';
import { OutlineButton } from './ui';

type MediaJournal = {
  type?: string;
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  documentUrl?: string;
  fileUrl?: string;
  title?: string;
};

export function journalMediaUrl(journal: MediaJournal): string | null {
  const raw =
    journal.imageUrl || journal.videoUrl || journal.audioUrl || journal.documentUrl || journal.fileUrl || null;
  return raw ? getFileUrl(raw) : null;
}

export function JournalMedia({ journal }: { journal: MediaJournal }) {
  const type = (journal.type || 'text').toLowerCase();
  const url = journalMediaUrl(journal);

  if (type === 'image' && url) {
    return <Image source={{ uri: url }} style={styles.image} />;
  }

  if (type === 'audio' && url) {
    return <AudioPlayer uri={url} />;
  }

  if ((type === 'video' || type === 'ai_video') && url) {
    return (
      <View style={styles.box}>
        <Text style={styles.caption}>Video attachment</Text>
        <OutlineButton label="Open video" onPress={() => void Linking.openURL(url)} />
      </View>
    );
  }

  if ((type === 'doc' || type === 'document' || type === 'pdf') && url) {
    return (
      <View style={styles.box}>
        <Text style={styles.caption}>Document attachment</Text>
        <OutlineButton label="Open document" onPress={() => void Linking.openURL(url)} />
      </View>
    );
  }

  return null;
}

function AudioPlayer({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  return (
    <View style={styles.box}>
      <Text style={styles.caption}>Audio attachment</Text>
      <View style={styles.row}>
        <Pressable onPress={() => player.play()} style={styles.play} accessibilityRole="button" accessibilityLabel="Play audio">
          <Text style={styles.playText}>Play</Text>
        </Pressable>
        <Pressable onPress={() => player.pause()} style={styles.play} accessibilityRole="button" accessibilityLabel="Pause audio">
          <Text style={styles.playText}>Pause</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 240, borderRadius: 18, marginBottom: 16 },
  box: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  caption: { color: colors.textMuted, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  play: { backgroundColor: colors.olive, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18 },
  playText: { color: colors.white, fontWeight: '700' },
});
