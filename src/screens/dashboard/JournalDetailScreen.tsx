import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { deleteJournal, getJournal, updateJournal, type Journal } from '../../api';
import { JournalMedia } from '../../components/JournalMedia';
import { ShareJournalModal } from '../../components/ShareJournalModal';
import { TtsBar } from '../../components/TtsBar';
import { Banner, OutlineButton, PrimaryButton, TextField, screenPad } from '../../components/ui';
import { canCreateVideoFromJournal, htmlToPlainText } from '../../lib/format';
import { useNavigation } from '../../navigation';
import { colors } from '../../theme';

export function JournalDetailScreen({ id }: { id: string }) {
  const { replace, push } = useNavigation();
  const [journal, setJournal] = useState<Journal | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [tts, setTts] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    getJournal(id)
      .then((res) => {
        const data = res.data as Journal;
        setJournal(data);
        setTitle(data.title || '');
        setContent(data.content);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load journal'));
  }, [id]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await updateJournal(id, { title: title.trim() || undefined, content });
      setSuccess('Journal updated');
      setEditing(false);
      const res = await getJournal(id);
      setJournal(res.data as Journal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update journal');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert('Delete journal', 'Are you sure you want to delete this journal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteJournal(id)
            .then(() => replace({ name: 'library' }))
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to delete journal'));
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={screenPad} showsVerticalScrollIndicator={false}>
      <Text style={styles.kicker}>{(journal?.type || 'text').toUpperCase()}</Text>
      <Text style={styles.heading}>{journal?.title || 'Untitled'}</Text>
      {error ? <Banner message={error} /> : null}
      {success ? <Banner message={success} tone="success" /> : null}
      {tts && journal ? <TtsBar text={htmlToPlainText(journal.content)} onClose={() => setTts(false)} /> : null}
      {journal ? <JournalMedia journal={journal} /> : null}
      {editing ? (
        <>
          <TextField label="Title" value={title} onChangeText={setTitle} />
          <TextField label="Content" value={content} onChangeText={setContent} multiline style={{ minHeight: 180, textAlignVertical: 'top' }} />
          <PrimaryButton label={saving ? 'Saving...' : 'Save'} onPress={() => void save()} loading={saving} />
        </>
      ) : (
        <Text style={styles.body}>{htmlToPlainText(journal?.content || '')}</Text>
      )}
      <View style={styles.actions}>
        <OutlineButton label={editing ? 'Cancel' : 'Edit'} onPress={() => setEditing((v) => !v)} />
        <OutlineButton label="Listen" onPress={() => setTts(true)} />
        <OutlineButton label="Share" onPress={() => setShareOpen(true)} />
      </View>
      {journal && canCreateVideoFromJournal(journal.type) ? (
        <View style={{ marginTop: 8 }}>
          <PrimaryButton label="Create video" onPress={() => push({ name: 'create-video', journalId: id })} />
        </View>
      ) : null}
      <Pressable onPress={remove} style={styles.deleteWrap}>
        <Text style={styles.delete}>Delete journal</Text>
      </Pressable>
      <ShareJournalModal visible={shareOpen} journalId={id} journalTitle={journal?.title} onClose={() => setShareOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 12, fontWeight: '700', color: colors.olive, letterSpacing: 0.8, marginBottom: 6 },
  heading: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginBottom: 14 },
  body: { fontSize: 17, lineHeight: 26, color: colors.text, marginBottom: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  deleteWrap: { alignItems: 'center', paddingVertical: 18 },
  delete: { color: colors.danger, fontWeight: '700' },
});
