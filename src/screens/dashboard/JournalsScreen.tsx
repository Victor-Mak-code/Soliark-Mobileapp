import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { createJournal, getFileUrl, uploadAsset, uploadAudio, uploadDocument, uploadImage } from '../../api';
import { Banner, OutlineButton, PrimaryButton, Segmented, TextField, screenPad } from '../../components/ui';
import { hasWriteupContent } from '../../lib/format';
import { useNavigation } from '../../navigation';
import { colors } from '../../theme';

type Mode = 'write' | 'voice' | 'upload';

export function JournalsScreen({ initialMode = 'write' }: { initialMode?: Mode }) {
  const { replace } = useNavigation();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ uri: string; name: string; type: string; kind: 'image' | 'document' } | null>(
    null
  );

  useEffect(() => {
    void AudioModule.requestRecordingPermissionsAsync();
    void setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  }, []);

  const insertPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to insert images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setSaving(true);
    setError('');
    try {
      const uploaded = await uploadAsset(
        {
          uri: asset.uri,
          name: asset.fileName || 'image.jpg',
          type: asset.mimeType || 'image/jpeg',
        },
        'image'
      );
      if (uploaded.data) {
        const url = getFileUrl(uploaded.data.fileUrl);
        setContent((prev) => `${prev}\n<img src="${url}" />\n`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to insert photo');
    } finally {
      setSaving(false);
    }
  };

  const saveWrite = async () => {
    if (!hasWriteupContent(content)) {
      setError('Please enter some content');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await createJournal({ title: title.trim() || undefined, content, type: 'text' });
      setSuccess('Journal saved successfully');
      setTimeout(() => replace({ name: 'library' }), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save journal');
    } finally {
      setSaving(false);
    }
  };

  const startRec = async () => {
    setError('');
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRec = async () => {
    await recorder.stop();
    setRecordedUri(recorder.uri ?? null);
  };

  const saveRec = async () => {
    if (!recordedUri) {
      setError('No recording to save');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await uploadAudio(
        { uri: recordedUri, name: `recording-${Date.now()}.m4a`, type: 'audio/m4a' },
        title.trim() || undefined
      );
      setSuccess('Audio saved successfully!');
      setTimeout(() => replace({ name: 'library' }), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save audio');
    } finally {
      setSaving(false);
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mime = asset.mimeType || 'application/octet-stream';
    setPicked({
      uri: asset.uri,
      name: asset.name,
      type: mime,
      kind: mime.startsWith('image/') ? 'image' : 'document',
    });
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPicked({
      uri: asset.uri,
      name: asset.fileName || 'image.jpg',
      type: asset.mimeType || 'image/jpeg',
      kind: 'image',
    });
  };

  const saveUpload = async () => {
    if (!picked) return;
    setSaving(true);
    setError('');
    try {
      if (picked.kind === 'image') {
        await uploadImage(picked, title.trim() || undefined);
      } else {
        await uploadDocument(picked, title.trim() || undefined);
      }
      setSuccess('File uploaded successfully!');
      setTimeout(() => replace({ name: 'library' }), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={screenPad} keyboardShouldPersistTaps="handled">
      <Segmented
        options={[
          { label: 'Write', value: 'write' },
          { label: 'Upload', value: 'upload' },
          { label: 'Voice', value: 'voice' },
        ]}
        value={mode}
        onChange={(next) => setMode(next as Mode)}
      />
      {error ? <Banner message={error} /> : null}
      {success ? <Banner message={success} tone="success" /> : null}

      {mode === 'write' ? (
        <View style={styles.card}>
          <TextField label="Title (Optional)" value={title} onChangeText={setTitle} placeholder="Enter a title for your journal entry..." />
          <TextField
            label="Entry"
            value={content}
            onChangeText={setContent}
            placeholder="Start writing your journal entry here..."
            multiline
            style={{ minHeight: 180, textAlignVertical: 'top' }}
          />
          <Text style={styles.chars}>{content.length} characters</Text>
          <OutlineButton label="Insert photo" onPress={() => void insertPhoto()} />
          <View style={{ height: 10 }} />
          <PrimaryButton label={saving ? 'Saving...' : 'Save'} onPress={() => void saveWrite()} loading={saving} />
        </View>
      ) : null}

      {mode === 'voice' ? (
        <View style={styles.card}>
          <TextField label="Title (Optional)" value={title} onChangeText={setTitle} placeholder="Enter a title for your audio..." />
          <Pressable
            onPress={() => void (recorderState.isRecording ? stopRec() : startRec())}
            style={[styles.mic, recorderState.isRecording && styles.micOn]}
            accessibilityRole="button"
            accessibilityLabel={recorderState.isRecording ? 'Stop recording' : 'Tap to Speak'}
          >
            <Text style={styles.micText}>{recorderState.isRecording ? 'Stop' : 'Mic'}</Text>
          </Pressable>
          <Text style={styles.hint}>{recorderState.isRecording ? 'Recording...' : recordedUri ? 'Recording ready' : 'Tap to Speak'}</Text>
          {recordedUri ? <PrimaryButton label={saving ? 'Saving...' : 'Save Recording'} onPress={() => void saveRec()} loading={saving} /> : null}
        </View>
      ) : null}

      {mode === 'upload' ? (
        <View style={styles.card}>
          <TextField label="Title (Optional)" value={title} onChangeText={setTitle} placeholder="Enter a title for your file..." />
          <View style={{ gap: 10 }}>
            <PrimaryButton label="Choose image" onPress={() => void pickImage()} />
            <PrimaryButton label="Choose document" onPress={() => void pickFile()} />
          </View>
          {picked ? <Text style={styles.hint}>{picked.name}</Text> : null}
          {picked ? (
            <View style={{ marginTop: 12 }}>
              <PrimaryButton label={saving ? 'Saving...' : 'Upload File'} onPress={() => void saveUpload()} loading={saving} />
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
  },
  chars: { marginBottom: 12, color: colors.textMuted, fontSize: 13 },
  mic: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  micOn: { backgroundColor: '#DC2626' },
  micText: { color: colors.white, fontWeight: '700' },
  hint: { textAlign: 'center', color: colors.textMuted, marginBottom: 12 },
});
