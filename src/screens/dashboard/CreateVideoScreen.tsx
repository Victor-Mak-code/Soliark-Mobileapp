import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import {
  generateJournalVideo,
  getJournal,
  getJournalVideoGeneration,
  getVideoGenerationById,
  type Journal,
  type JournalVideoOptions,
  type VideoGenerationJob,
} from '../../api';
import { Banner, Chip, LoadingState, OutlineButton, PrimaryButton, TextField, screenPad } from '../../components/ui';
import { htmlToPlainText } from '../../lib/format';
import { useNavigation } from '../../navigation';
import { colors } from '../../theme';

const RESOLUTIONS = ['480p', '720p', '1080p', '4K'];
const ASPECTS = ['16:9', '9:16', '1:1'];
const SCENE_STYLES = ['Cinematic', 'Documentary', 'Dreamy', 'Vintage', 'Modern'];
const VISUAL_STYLES = ['Realistic', 'Animated', 'Watercolor', 'Film Noir', 'Vibrant'];
const TRANSITIONS = ['Fade In/Out', 'Hard Cut', 'Dissolve', 'Slide'];
const PACING = ['Dynamic', 'Steady', 'Slow Burn'];
const VOICES = ['Female Voice', 'Male Voice', 'Neutral Voice'];
const SPEEDS = ['Slow Speed', 'Normal Speed', 'Fast Speed'];
const BACKGROUNDS = ['Natural', 'Studio', 'Abstract', 'Outdoor', 'Indoor'];
const LIGHTING = ['Soft daylight', 'Golden hour', 'Dramatic contrast', 'Cool moonlight'];

function statusLabel(status?: string) {
  if (status === 'queued') return 'Queued...';
  if (status === 'processing') return 'Generating...';
  if (status === 'saving') return 'Saving...';
  if (status === 'completed') return 'Video ready';
  if (status === 'failed') return 'Generation failed';
  return '';
}

export function CreateVideoScreen({ journalId }: { journalId: string }) {
  const { push } = useNavigation();
  const [journal, setJournal] = useState<Journal | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [job, setJob] = useState<VideoGenerationJob | null>(null);
  const [resolution, setResolution] = useState('1080p');
  const [duration, setDuration] = useState('30');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [sceneStyle, setSceneStyle] = useState('Cinematic');
  const [visualStyle, setVisualStyle] = useState('Realistic');
  const [transitions, setTransitions] = useState('Fade In/Out');
  const [pacing, setPacing] = useState('Steady');
  const [narrationVoice, setNarrationVoice] = useState('Female Voice');
  const [narrationSpeed, setNarrationSpeed] = useState('Normal Speed');
  const [background, setBackground] = useState('Natural');
  const [lighting, setLighting] = useState('Soft daylight');
  const [characterNotes, setCharacterNotes] = useState('');
  const [backgroundMusic, setBackgroundMusic] = useState(true);
  const [subtitles, setSubtitles] = useState(true);

  useEffect(() => {
    getJournal(journalId)
      .then((res) => setJournal(res.data as Journal))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load journal'))
      .finally(() => setLoading(false));
    getJournalVideoGeneration(journalId)
      .then((res) => {
        if (res.data) setJob(res.data);
      })
      .catch(() => undefined);
  }, [journalId]);

  useEffect(() => {
    if (!job || !['queued', 'processing', 'saving'].includes(job.status)) return;
    const timer = setInterval(() => {
      getVideoGenerationById(job.id)
        .then((res) => {
          if (res.data) setJob(res.data);
        })
        .catch(() => undefined);
    }, 4000);
    return () => clearInterval(timer);
  }, [job?.id, job?.status]);

  const generate = async () => {
    if (!journal) return;
    setStarting(true);
    setError('');
    try {
      const options: JournalVideoOptions = {
        resolution,
        duration: Number(duration) || 30,
        aspectRatio,
        sceneStyle,
        visualStyle,
        lighting,
        background,
        characterNotes: characterNotes.trim() || undefined,
        pacing,
        transitions,
        narrationVoice,
        narrationSpeed,
        backgroundMusic,
        subtitles,
      };
      const response = await generateJournalVideo(journal._id, htmlToPlainText(journal.content), options);
      if (response.data) setJob(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start video generation');
    } finally {
      setStarting(false);
    }
  };

  const busy = starting || job?.status === 'queued' || job?.status === 'processing' || job?.status === 'saving';

  return (
    <ScrollView contentContainerStyle={screenPad} keyboardShouldPersistTaps="handled">
<Text style={styles.meta}>Choose quality, style, and voice, then generate.</Text>
      {loading ? <LoadingState /> : null}
      {error ? <Banner message={error} /> : null}
      {job ? <Banner message={job.error || statusLabel(job.status)} tone={job.status === 'failed' ? 'error' : 'success'} /> : null}

      <Text style={styles.section}>Source</Text>
      <Text style={styles.body}>{journal?.title || 'Untitled Journal'}</Text>
      <Text style={styles.meta} numberOfLines={4}>{htmlToPlainText(journal?.content || '')}</Text>

      <Text style={styles.section}>Video Quality Settings</Text>
      <OptionRow label="Resolution" value={resolution} options={RESOLUTIONS} onChange={setResolution} />
      <OptionRow label="Aspect ratio" value={aspectRatio} options={ASPECTS} onChange={setAspectRatio} />
      <TextField label="Clip length (seconds)" value={duration} onChangeText={setDuration} keyboardType="number-pad" />

      <Text style={styles.section}>Style</Text>
      <OptionRow label="Scene style" value={sceneStyle} options={SCENE_STYLES} onChange={setSceneStyle} />
      <OptionRow label="Visual style" value={visualStyle} options={VISUAL_STYLES} onChange={setVisualStyle} />
      <OptionRow label="Transitions" value={transitions} options={TRANSITIONS} onChange={setTransitions} />
      <OptionRow label="Pacing" value={pacing} options={PACING} onChange={setPacing} />

      <Text style={styles.section}>Background Settings</Text>
      <OptionRow label="Background" value={background} options={BACKGROUNDS} onChange={setBackground} />
      <Text style={styles.section}>Lighting Controls</Text>
      <OptionRow label="Lighting" value={lighting} options={LIGHTING} onChange={setLighting} />

      <Text style={styles.section}>Character Settings</Text>
      <TextField label="Character notes" value={characterNotes} onChangeText={setCharacterNotes} placeholder="Appearance, wardrobe, mood..." />

      <Text style={styles.section}>Voice Settings</Text>
      <OptionRow label="Narration voice" value={narrationVoice} options={VOICES} onChange={setNarrationVoice} />
      <OptionRow label="Narration speed" value={narrationSpeed} options={SPEEDS} onChange={setNarrationSpeed} />

      <View style={styles.toggle}>
        <Text style={styles.toggleLabel}>Background music</Text>
        <Switch value={backgroundMusic} onValueChange={setBackgroundMusic} trackColor={{ true: colors.olive }} />
      </View>
      <View style={styles.toggle}>
        <Text style={styles.toggleLabel}>Subtitles</Text>
        <Switch value={subtitles} onValueChange={setSubtitles} trackColor={{ true: colors.olive }} />
      </View>

      <PrimaryButton label={busy ? 'Generating...' : 'Generate Video'} onPress={() => void generate()} loading={busy} disabled={!journal} />
      {job?.status === 'completed' && job.resultJournalId ? (
        <View style={{ marginTop: 12 }}>
          <OutlineButton label="Open Video" onPress={() => push({ name: 'journal', id: job.resultJournalId! })} />
        </View>
      ) : null}
      {busy ? <Text style={styles.meta}>You'll be notified when your video is ready</Text> : null}
    </ScrollView>
  );
}

function OptionRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.wrap}>
        {options.map((option) => (
          <Chip key={option} label={option} active={value === option} onPress={() => onChange(option)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.olive, fontWeight: '700', marginBottom: 8 },
  section: { fontWeight: '800', fontSize: 16, color: colors.text, marginTop: 16, marginBottom: 10 },
  body: { color: colors.text, fontWeight: '700', marginBottom: 6 },
  meta: { color: colors.textMuted, marginBottom: 8, lineHeight: 20 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionLabel: { fontWeight: '700', color: colors.textMuted, marginBottom: 8, fontSize: 12 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  toggleLabel: { fontWeight: '700', color: colors.text },
});
