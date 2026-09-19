import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSharedItem, updateJournal, type SharedJournalItem } from '../../api';
import { JournalMedia } from '../../components/JournalMedia';
import { Banner, LoadingState, OutlineButton, PrimaryButton, TextField, screenPad } from '../../components/ui';
import { formatDate, htmlToPlainText } from '../../lib/format';
import { colors } from '../../theme';

export function SharedItemScreen({ id }: { id: string }) {
  
  const [item, setItem] = useState<SharedJournalItem | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await getSharedItem(id);
    if (!res.data) throw new Error('Shared item not found');
    setItem(res.data);
    setTitle(res.data.journal.title || '');
    setContent(res.data.journal.content || '');
  };

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load shared journal'))
      .finally(() => setLoading(false));
  }, [id]);

  const canEdit = item?.contributorRole === 'editor';

  const save = async () => {
    if (!item) return;
    setSaving(true);
    setError('');
    try {
      await updateJournal(item.journal._id, { title: title.trim() || undefined, content });
      await load();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save journal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={screenPad} keyboardShouldPersistTaps="handled">
      {loading ? <LoadingState /> : null}
      {error ? <Banner message={error} /> : null}
      {item ? (
        <>
          <Text style={styles.heading}>{item.journal.title || 'Untitled'}</Text>
          {item.journal ? <JournalMedia journal={item.journal} /> : null}
          {editing && canEdit ? (
            <>
              <TextField label="Title" value={title} onChangeText={setTitle} />
              <TextField label="Content" value={content} onChangeText={setContent} multiline style={{ minHeight: 180, textAlignVertical: 'top' }} />
              <PrimaryButton label={saving ? 'Saving...' : 'Save'} onPress={() => void save()} loading={saving} />
              <View style={{ height: 8 }} />
              <OutlineButton label="Cancel" onPress={() => setEditing(false)} />
            </>
          ) : (
            <Text style={styles.body}>{htmlToPlainText(item.journal.content)}</Text>
          )}
          {canEdit && !editing ? <OutlineButton label="Edit journal" onPress={() => setEditing(true)} /> : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.olive, fontWeight: '700', marginBottom: 8 },
  heading: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginBottom: 12 },
  body: { fontSize: 17, lineHeight: 26, color: colors.text, marginBottom: 16 },
});
