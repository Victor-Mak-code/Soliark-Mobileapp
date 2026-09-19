'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, Volume2, Sparkles, Eye, Monitor, Zap, Palette, Sun, Moon, User } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/components/ToastContext';
import {
  getJournal,
  generateJournalVideo,
  getVideoGenerationById,
  type Journal,
  type VideoGenerationJob,
  type JournalVideoOptions,
} from '@/lib/api';
import {
  canCreateVideoFromJournal,
  resolveJournalSourceText,
  isActiveVideoJob,
  saveJournalVideoJob,
  getStoredJournalVideoJobId,
  clearJournalVideoJob,
} from '@/lib/journalVideo';
import { useI18n } from '@/i18n/I18nProvider';
import VideoPromptGuidelines from '@/components/VideoPromptGuidelines';
import { htmlToPlainText } from '@/components/editor/htmlUtils';

const ACCENT = 'rgb(193,88,58)';
const AMBER = 'rgb(230,168,77)';

type TabId = 'quality' | 'style' | 'background' | 'lighting' | 'character';

const TABS: { id: TabId; label: string }[] = [
  { id: 'quality', label: 'Quality' },
  { id: 'style', label: 'Style' },
  { id: 'background', label: 'Background' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'character', label: 'Character' },
];

interface Scene {
  id: string;
  label: string;
  seconds: number;
  text: string;
}

const SCENE_LABELS = ['Opening', 'Main Content', 'Reflection', 'Closing'];
const SCENE_GRADIENTS = [
  'from-emerald-700 to-emerald-900',
  'from-slate-500 to-slate-700',
  'from-amber-600 to-amber-800',
  'from-stone-600 to-stone-800',
];

const DEFAULT_SCENES: Scene[] = [
  { id: 's1', label: 'Opening', seconds: 15, text: '' },
  { id: 's2', label: 'Main Content', seconds: 150, text: '' },
  { id: 's3', label: 'Reflection', seconds: 80, text: '' },
  { id: 's4', label: 'Closing', seconds: 25, text: '' },
];

type VoiceGender = 'female' | 'male' | 'child';

const VOICES: {
  id: string;
  name: string;
  accent: string;
  lang: string;
  gender: VoiceGender;
  pitch?: number;
  rate?: number;
}[] = [
  { id: 'sarah', name: 'Sarah - Natural Female', accent: 'British accent', lang: 'en-GB', gender: 'female' },
  {
    id: 'david',
    name: 'David - Deep Male',
    accent: 'American accent',
    lang: 'en-US',
    gender: 'male',
    pitch: 0.75,
  },
  {
    id: 'emma',
    name: 'Emma - Young girl',
    accent: 'Canadian accent',
    lang: 'en-CA',
    gender: 'child',
    pitch: 2,
    rate: 1.1,
  },
  { id: 'james', name: 'James - Narrator', accent: 'Australian accent', lang: 'en-AU', gender: 'male' },
];

const FEMALE_VOICE_NAMES =
  /zira|hazel|susan|samantha|victoria|karen|moira|tessa|salli|ivy|joanna|kendra|kimberly|linda|eva|aria|jenny|michelle|heather|sonia|libby|natasha|catherine|anna|emma|sarah|female|woman|girl|child|kid|princess/i;
const MALE_VOICE_NAMES =
  /david|mark|george|daniel|james|ravi|fred|thomas|richard|guy|tom|sean|ryan|matthew|justin|joey|geraint|steffan|male|man|boy/i;
const CHILD_VOICE_NAMES = /ivy|child|kid|girl|princess/i;

function normalizeLang(lang: string): string {
  return lang.replace('_', '-').toLowerCase();
}

function pickSpeechVoice(
  voices: SpeechSynthesisVoice[],
  preferredLang: string,
  gender: VoiceGender
): SpeechSynthesisVoice | undefined {
  const english = voices.filter((voice) => normalizeLang(voice.lang).startsWith('en'));
  const pool = english.length > 0 ? english : voices;
  if (pool.length === 0) return undefined;

  const isFemale = (voice: SpeechSynthesisVoice) =>
    FEMALE_VOICE_NAMES.test(voice.name) && !MALE_VOICE_NAMES.test(voice.name);
  const isMale = (voice: SpeechSynthesisVoice) =>
    MALE_VOICE_NAMES.test(voice.name) && !FEMALE_VOICE_NAMES.test(voice.name);
  const isChild = (voice: SpeechSynthesisVoice) => CHILD_VOICE_NAMES.test(voice.name);

  const preferred = normalizeLang(preferredLang);

  const ranked = pool
    .map((voice) => {
      let genderScore = 0;
      if (gender === 'child') {
        if (isChild(voice)) genderScore = 4;
        else if (isFemale(voice)) genderScore = 3;
        else if (isMale(voice)) genderScore = -8;
      } else if (gender === 'female') {
        if (isFemale(voice)) genderScore = 3;
        else if (isMale(voice)) genderScore = -8;
      } else if (isMale(voice)) {
        genderScore = 3;
      } else if (isFemale(voice)) {
        genderScore = -8;
      }

      const voiceLang = normalizeLang(voice.lang);
      let langScore = 0;
      if (voiceLang === preferred) langScore = 3;
      else if (voiceLang.split('-')[0] === preferred.split('-')[0]) langScore = 1;

      return { voice, score: genderScore * 10 + langScore };
    })
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.voice ?? pool.find((voice) => !isMale(voice)) ?? pool[0];
}

function loadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const finish = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', finish);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', finish);
    window.setTimeout(finish, 400);
  });
}

const RESOLUTIONS = [
  { id: '480p', label: '480p', note: 'Draft' },
  { id: '720p', label: '720p', note: 'Balanced' },
  { id: '1080p', label: '1080p', note: 'High' },
  { id: '4k', label: '4K', note: 'Maximum' },
];

type FalResolution = '480p' | '720p' | '1080p' | '4k';
type QualityTier = 'recommended' | 'premium' | null;

interface QualityPreset {
  id: string;
  name: string;
  badge: string;
  badgeClass: string;
  tier: QualityTier;
  flash: boolean;
  description: string;
  resolution: string;
  frameRate: string;
  codec: string;
  size: string;
  time: string;
  quality: string;
  // Seedance tops out at 4K, so higher presets are rendered at the nearest supported resolution.
  falResolution: FalResolution;
}

const QUALITY_PRESETS: QualityPreset[] = [
  {
    id: 'hd-basic',
    name: 'HD Basic',
    badge: '720p',
    badgeClass: 'bg-sky-100 text-sky-700',
    tier: null,
    flash: false,
    description: 'Perfect for quick previews and social media sharing',
    resolution: '1280x720',
    frameRate: '24fps',
    codec: 'H264',
    size: '150MB',
    time: '2-3 minutes',
    quality: 'Standard',
    falResolution: '720p',
  },
  {
    id: 'fhd-standard',
    name: 'Full HD Standard',
    badge: '1080p',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    tier: 'recommended',
    flash: false,
    description: 'Great balance of quality and file size',
    resolution: '1920x1080',
    frameRate: '30fps',
    codec: 'H265',
    size: '500MB',
    time: '5-8 minutes',
    quality: 'High',
    falResolution: '1080p',
  },
  {
    id: 'fhd-premium',
    name: 'Full HD Premium',
    badge: '1080p',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    tier: null,
    flash: true,
    description: 'High-quality with smooth motion',
    resolution: '1920x1080',
    frameRate: '60fps',
    codec: 'H265',
    size: '800MB',
    time: '8-12 minutes',
    quality: 'Ultra',
    falResolution: '1080p',
  },
  {
    id: '2k-standard',
    name: '2K Standard',
    badge: '1440p',
    badgeClass: 'bg-amber-100 text-amber-700',
    tier: 'premium',
    flash: true,
    description: 'Sharp detail for professional content',
    resolution: '2560x1440',
    frameRate: '30fps',
    codec: 'H265',
    size: '900MB',
    time: '10-15 minutes',
    quality: 'High',
    falResolution: '1080p',
  },
  {
    id: '4k-ultra',
    name: '4K Ultra HD',
    badge: '4K',
    badgeClass: 'bg-rose-100 text-rose-600',
    tier: 'premium',
    flash: true,
    description: 'Cinema-quality for large screens',
    resolution: '3840x2160',
    frameRate: '30fps',
    codec: 'H265',
    size: '2.5GB',
    time: '20-30 minutes',
    quality: 'Ultra',
    falResolution: '4k',
  },
  {
    id: '4k-cinematic',
    name: '4K Cinematic',
    badge: '4K',
    badgeClass: 'bg-rose-100 text-rose-600',
    tier: 'premium',
    flash: true,
    description: 'Professional film-grade quality',
    resolution: '3840x2160',
    frameRate: '24fps',
    codec: 'PRORES',
    size: '8GB',
    time: '45-60 minutes',
    quality: 'Lossless',
    falResolution: '4k',
  },
];

const TIME_OF_DAY_OPTIONS = ['Dawn', 'Day', 'Golden Hour', 'Dusk', 'Night'];

const BACKGROUND_PRESETS = [
  {
    id: 'Nature',
    label: 'Nature',
    image: '/backgrounds/nature.webp',
  },
  {
    id: 'Office',
    label: 'Office',
    image: '/backgrounds/office.webp',
  },
  {
    id: 'Cafe',
    label: 'Cafe',
    image: '/backgrounds/cafe.webp',
  },
  {
    id: 'Library',
    label: 'Library',
    image: '/backgrounds/library.webp',
  },
  {
    id: 'Studio',
    label: 'Studio',
    image: '/backgrounds/studio.webp',
  },
  {
    id: 'Home',
    label: 'Home',
    image: '/backgrounds/home.webp',
  },
];

const CHARACTER_STYLES = [
  {
    id: 'Professional',
    label: 'Professional',
    description: 'Business attire, confident pose',
  },
  {
    id: 'Casual',
    label: 'Casual',
    description: 'Relaxed clothing, friendly appearance',
  },
  {
    id: 'Creative',
    label: 'Creative',
    description: 'Artistic style, expressive look',
  },
  {
    id: 'Academic',
    label: 'Academic',
    description: 'Scholarly appearance, thoughtful pose',
  },
];

// Published fal.ai per-second rates for Seedance 2.0 text-to-video.
const RATE_PER_SECOND: Record<string, number> = {
  '720p': 0.3034,
  '1080p': 0.682,
};

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function splitIntoScenes(text: string): Scene[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  if (sentences.length === 0) return [];

  const sceneCount = Math.min(SCENE_LABELS.length, Math.max(1, Math.ceil(sentences.length / 2)));
  const perScene = Math.ceil(sentences.length / sceneCount);
  const scenes: Scene[] = [];

  for (let i = 0; i < sceneCount; i += 1) {
    const chunk = sentences.slice(i * perScene, (i + 1) * perScene).join(' ');
    if (!chunk) continue;
    const words = chunk.split(/\s+/).length;
    scenes.push({
      id: `scene-${i}`,
      label: SCENE_LABELS[i] ?? `Scene ${i + 1}`,
      seconds: Math.max(5, Math.round(words / 2.5)),
      text: chunk,
    });
  }

  return scenes;
}

export default function JournalCreateVideoPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const journalId = params.id as string;

  const [journal, setJournal] = useState<Journal | null>(null);
  const [journalLoading, setJournalLoading] = useState(true);
  const [journalError, setJournalError] = useState('');

  const [activeTab, setActiveTab] = useState<TabId>('quality');
  const [sourceText, setSourceText] = useState('');
  const [title, setTitle] = useState('');
  const [scenes, setScenes] = useState<Scene[]>(DEFAULT_SCENES);
  const [selectedSceneId, setSelectedSceneId] = useState<string>('s4');
  const [showScenePreview, setShowScenePreview] = useState(false);

  const [narrationVoice, setNarrationVoice] = useState('');
  const [narrationSpeed, setNarrationSpeed] = useState('Normal Speed');
  const [sceneStyle, setSceneStyle] = useState('Cinematic');
  const [visualStyle, setVisualStyle] = useState('Realistic');
  const [transitions, setTransitions] = useState('Fade In/Out');
  const [pacing, setPacing] = useState('Dynamic');
  const [autoScenes, setAutoScenes] = useState(true);
  const [backgroundMusic, setBackgroundMusic] = useState(true);
  const [subtitles, setSubtitles] = useState(true);

  const [resolution, setResolution] = useState('1080p');
  const [clipLength, setClipLength] = useState(10);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [qualityPresetId, setQualityPresetId] = useState('fhd-standard');
  const [customQuality, setCustomQuality] = useState(false);

  const [backgroundPreset, setBackgroundPreset] = useState('');
  const [backgroundDetails, setBackgroundDetails] = useState('');
  const [brightness, setBrightness] = useState(50);
  const [lightingMode, setLightingMode] = useState<'Warm' | 'Cool' | null>(null);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [characterStyle, setCharacterStyle] = useState('');

  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [job, setJob] = useState<VideoGenerationJob | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollInFlightRef = useRef(false);

  const totalSeconds = scenes.reduce((sum, scene) => sum + scene.seconds, 0);
  const isGenerating =
    isStarting ||
    job?.status === 'queued' ||
    job?.status === 'processing' ||
    job?.status === 'saving';

  const estimatedSizeMb = useMemo(() => {
    const mbps: Record<string, number> = {
      '480p': 1.5,
      '720p': 3,
      '1080p': 6,
      '4k': 20,
    };
    return Math.round(((mbps[resolution] ?? 3) * clipLength) / 8);
  }, [resolution, clipLength]);

  const estimatedCost = RATE_PER_SECOND[resolution]
    ? (RATE_PER_SECOND[resolution] * clipLength).toFixed(2)
    : null;

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    getJournal(journalId)
      .then(async (response) => {
        if (cancelled || !response.data) return;
        const journalData = response.data as Journal;
        if (!canCreateVideoFromJournal(journalData)) {
          setJournalError('Video generation is only available for text and document journals');
          return;
        }
        setJournal(journalData);
        setTitle(journalData.title || '');
        try {
          if (journalData.type === 'text') {
            const text = htmlToPlainText(journalData.content || '');
            if (!cancelled) setSourceText(text);
          } else {
            const text = await resolveJournalSourceText(journalData);
            if (!cancelled && text) setSourceText(text);
          }
        } catch (err) {
          if (!cancelled) {
            setJournalError(err instanceof Error ? err.message : 'Failed to read journal content');
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setJournalError(err.message || 'Failed to load journal');
      })
      .finally(() => {
        if (!cancelled) setJournalLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [journalId]);

  useEffect(() => {
    const storedId = getStoredJournalVideoJobId(journalId);
    if (storedId) {
      getVideoGenerationById(storedId)
        .then((response) => {
          if (response.data) setJob(response.data);
          else clearJournalVideoJob(journalId);
        })
        .catch(() => clearJournalVideoJob(journalId));
    }
    return stopPolling;
  }, [journalId]);

  useEffect(() => {
    if (!job) return;

    if (isActiveVideoJob(job.status)) {
      if (pollRef.current) return;
      pollRef.current = setInterval(async () => {
        if (pollInFlightRef.current) return;
        pollInFlightRef.current = true;
        try {
          const response = await getVideoGenerationById(job.id);
          if (!response.data) return;
          setJob(response.data);

          if (response.data.status === 'completed') {
            stopPolling();
            clearJournalVideoJob(journalId);
            toast('Your video is ready', 'success');
          } else if (response.data.status === 'failed') {
            stopPolling();
            clearJournalVideoJob(journalId);
            toast(response.data.error || 'Video generation failed', 'error');
          }
        } catch {
          stopPolling();
        } finally {
          pollInFlightRef.current = false;
        }
      }, 4000);
    } else {
      stopPolling();
    }
  }, [job?.id, job?.status, journalId, toast]);

  const handleAnalyze = () => {
    const next = splitIntoScenes(sourceText);
    if (next.length === 0) {
      toast('No journal content to analyze yet', 'info');
      return;
    }
    setScenes(next);
    setSelectedSceneId(next[next.length - 1].id);
    setShowScenePreview(true);
    toast(`Detected ${next.length} scene${next.length === 1 ? '' : 's'}`, 'success');
  };

  // Auto-build the storyboard from the journal's own content once it loads
  // (no manual text entry — see the "Style" tab for Auto Scene Detection).
  const autoAnalyzedRef = useRef(false);
  useEffect(() => {
    if (!autoScenes || autoAnalyzedRef.current || !sourceText.trim()) return;
    autoAnalyzedRef.current = true;
    const next = splitIntoScenes(sourceText);
    if (next.length > 0) {
      setScenes(next);
      setSelectedSceneId(next[next.length - 1].id);
      setShowScenePreview(true);
    }
  }, [autoScenes, sourceText]);

  const handlePreviewVoice = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const voice = VOICES.find((v) => v.id === voiceId);
    if (!voice) return;

    const speak = (voices: SpeechSynthesisVoice[]) => {
      window.speechSynthesis.cancel();
      const sample = sourceText.trim().slice(0, 140) || 'This is how your narration will sound.';
      const utterance = new SpeechSynthesisUtterance(sample);
      const match = pickSpeechVoice(voices, voice.lang, voice.gender);
      if (match) utterance.voice = match;
      utterance.pitch = voice.pitch ?? 1;
      const speed =
        narrationSpeed === 'Slow Speed' ? 0.8 : narrationSpeed === 'Fast Speed' ? 1.2 : 1;
      utterance.rate = speed * (voice.rate ?? 1);
      window.setTimeout(() => window.speechSynthesis.speak(utterance), 40);
    };

    void loadSpeechVoices().then(speak);
  };

  const handleGenerate = async () => {
    if (!sourceText.trim()) {
      toast('This journal has no readable content to generate a video from', 'error');
      return;
    }

    setIsStarting(true);
    try {
      const voice = VOICES.find((v) => v.id === selectedVoiceId);
      const lightingChosen = lightingMode !== null || Boolean(timeOfDay);
      const lightingDescription = lightingChosen
        ? [
            lightingMode ? `${lightingMode.toLowerCase()} lighting` : '',
            `${brightness}% brightness`,
            timeOfDay ? `${timeOfDay.toLowerCase()} time of day` : '',
          ]
            .filter(Boolean)
            .join(', ')
        : '';

      const character = CHARACTER_STYLES.find((style) => style.id === characterStyle);
      const narration =
        voice
          ? `${voice.name.split(' - ')[1] || voice.name} (${voice.accent})`
          : narrationVoice.trim();

      const options: JournalVideoOptions = {
        resolution,
        duration: clipLength,
        aspectRatio,
        sceneStyle,
        visualStyle,
        pacing,
        transitions,
        backgroundMusic,
        subtitles,
      };

      const background = [backgroundPreset, backgroundDetails].filter(Boolean).join(', ');
      if (background) options.background = background;
      if (lightingDescription) options.lighting = lightingDescription;
      if (character) {
        options.characterNotes = [character.label, character.description]
          .filter(Boolean)
          .join(', ');
      }
      if (narration) {
        options.narrationVoice = narration;
        options.narrationSpeed = narrationSpeed;
      }

      const response = await generateJournalVideo(journalId, sourceText, options);

      if (response.data) {
        setJob(response.data);
        if (isActiveVideoJob(response.data.status)) {
          saveJournalVideoJob(journalId, response.data.id);
        }
        toast('Video generation started', 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to start video generation', 'error');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSelectPreset = (preset: QualityPreset) => {
    setQualityPresetId(preset.id);
    setResolution(preset.falResolution);
  };

  const selectedScene = scenes.find((s) => s.id === selectedSceneId);

  if (journalLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8">
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(112,130,56)]" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (journalError && !journal) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8">
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-700 dark:text-red-300 mb-4">{journalError}</p>
            <button
              onClick={() => router.push(`/journals/${journalId}`)}
              className="px-4 py-2 bg-[rgb(112,130,56)] text-white rounded-lg hover:bg-[rgb(95,110,48)] transition-colors"
            >
              Back to Journal
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="@container p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8 max-w-[1600px]">
        <button
          onClick={() => router.push(`/journals/${journalId}`)}
          className="mb-4 flex items-center gap-2 text-gray-600 dark:text-stone-300 hover:text-gray-800 dark:text-stone-100 transition-colors"
        >
          <span>←</span>
          <span className="text-sm sm:text-base">Back to Journal</span>
        </button>

        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-stone-100 mb-2">
            {t('videoCreator.title')}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-stone-300">
            {journal ? `From "${journal.title || 'Untitled Journal'}" — ${t('videoCreator.subtitle')}` : t('videoCreator.subtitle')}
          </p>
        </header>

        <div className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm mb-4 lg:mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">
            Video Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title for the saved video"
            className="w-full mb-3 px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-lg text-sm text-gray-900 dark:text-stone-100 bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)]/40"
          />
          <VideoPromptGuidelines />
        </div>

        <div className="grid grid-cols-1 @3xl:grid-cols-[220px_minmax(0,1fr)] @4xl:grid-cols-[220px_minmax(0,1fr)_240px] @6xl:grid-cols-[260px_minmax(0,1fr)_280px] gap-4 lg:gap-6 items-start">
          {/* Storyboard Preview */}
          <section className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Play className="w-4 h-4" style={{ color: 'rgb(112,130,56)' }} />
              <h2 className="font-semibold text-gray-800 dark:text-stone-100">{t('videoCreator.storyboard')}</h2>
            </div>

            <div className="space-y-3">
              {scenes.map((scene, index) => {
                const isSelected = scene.id === selectedSceneId;
                return (
                  <button
                    key={scene.id}
                    onClick={() => setSelectedSceneId(scene.id)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg border transition-colors text-left ${
                      isSelected
                        ? 'text-white border-transparent'
                        : 'bg-white dark:bg-stone-900 border-gray-200 dark:border-stone-700 hover:bg-gray-50 dark:hover:bg-stone-800'
                    }`}
                    style={isSelected ? { backgroundColor: ACCENT } : undefined}
                  >
                    <div className="relative w-12 h-10 rounded-md overflow-hidden flex-shrink-0">
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${
                          SCENE_GRADIENTS[index % SCENE_GRADIENTS.length]
                        }`}
                      />
                      <img
                        src={BACKGROUND_PRESETS[index % BACKGROUND_PRESETS.length].image}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold leading-tight truncate"
                        title={scene.label}
                      >
                        {scene.label}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span
                          className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-stone-400'}`}
                        >
                          {formatDuration(scene.seconds)}
                        </span>
                        <span
                          className={`text-[10px] leading-none px-1.5 py-0.5 rounded border whitespace-nowrap flex-shrink-0 ${
                            isSelected
                              ? 'border-white/40 text-white'
                              : 'border-gray-300 dark:border-stone-600 text-gray-600 dark:text-stone-300'
                          }`}
                        >
                          Scene {index + 1}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-stone-700 flex items-center justify-between text-xs text-gray-600 dark:text-stone-300">
              <span>
                Total Duration: <strong className="text-gray-800 dark:text-stone-100">{formatDuration(totalSeconds)}</strong>
              </span>
              <span>
                Scenes: <strong className="text-gray-800 dark:text-stone-100">{scenes.length}</strong>
              </span>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!sourceText.trim()}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 dark:border-stone-700 bg-gray-50 dark:bg-stone-800 text-sm text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Re-analyze</span>
            </button>

            <button
              onClick={() => setShowScenePreview((prev) => !prev)}
              disabled={scenes.every((s) => !s.text)}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 dark:border-stone-700 bg-gray-50 dark:bg-stone-800 text-sm text-gray-700 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>{showScenePreview ? 'Hide Scenes' : 'Preview Scenes'}</span>
            </button>

            {showScenePreview && (
              <div className="mt-3 space-y-3">
                {scenes
                  .filter((scene) => scene.text)
                  .map((scene, index) => (
                    <div
                      key={scene.id}
                      className="p-3 rounded-lg border border-gray-200 dark:border-stone-700 bg-gray-50 dark:bg-stone-800"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800 dark:text-stone-100">
                          Scene {index + 1} · {scene.label}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-stone-400">
                          {formatDuration(scene.seconds)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-stone-300 leading-relaxed">{scene.text}</p>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* Center column */}
          <section className="min-w-0">
            <div className="flex gap-1 p-1 rounded-xl bg-[#ece5d8] dark:bg-stone-800 mb-4 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-stone-900 shadow-sm text-gray-900 dark:text-stone-100'
                      : 'text-gray-600 dark:text-stone-300 hover:text-gray-800 dark:text-stone-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm">
              {activeTab === 'style' && (
                <>
                  <div className="flex items-center gap-2 mb-5">
                    <Sparkles className="w-4 h-4" style={{ color: 'rgb(112,130,56)' }} />
                    <h2 className="font-semibold text-gray-800 dark:text-stone-100">Narration &amp; Style</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <SelectField
                      label="Narration Voice"
                      value={narrationVoice}
                      onChange={setNarrationVoice}
                      options={['Female Voice', 'Male Voice', 'Neutral Voice']}
                      allowNone
                    />
                    <SelectField
                      label="Narration Speed"
                      value={narrationSpeed}
                      onChange={setNarrationSpeed}
                      options={['Slow Speed', 'Normal Speed', 'Fast Speed']}
                    />
                    <SelectField
                      label="Scene Style"
                      value={sceneStyle}
                      onChange={setSceneStyle}
                      options={['Cinematic', 'Documentary', 'Dreamy', 'Vintage', 'Modern']}
                    />
                    <SelectField
                      label="Visual Style"
                      value={visualStyle}
                      onChange={setVisualStyle}
                      options={['Realistic', 'Animated', 'Watercolor', 'Film Noir', 'Vibrant']}
                    />
                    <SelectField
                      label="Scene Transitions"
                      value={transitions}
                      onChange={setTransitions}
                      options={['Fade In/Out', 'Hard Cut', 'Dissolve', 'Slide']}
                    />
                    <SelectField
                      label="Video Pacing"
                      value={pacing}
                      onChange={setPacing}
                      options={['Dynamic', 'Steady', 'Slow Burn']}
                    />
                  </div>

                  <div className="space-y-1">
                    <ToggleRow
                      label="Auto Scene Detection"
                      description="Automatically break your journal's content into a storyboard"
                      checked={autoScenes}
                      onChange={setAutoScenes}
                    />
                    <ToggleRow
                      label="Background Music"
                      description="Add atmospheric background music"
                      checked={backgroundMusic}
                      onChange={setBackgroundMusic}
                    />
                    <ToggleRow
                      label="Subtitles"
                      description="Display text as subtitles"
                      checked={subtitles}
                      onChange={setSubtitles}
                    />
                  </div>
                </>
              )}

              {activeTab === 'quality' && (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" style={{ color: 'rgb(112,130,56)' }} />
                      <h2 className="font-semibold text-gray-800 dark:text-stone-100">{t('videoCreator.quality')}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-stone-300">Custom</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={customQuality}
                        aria-label="Custom quality settings"
                        onClick={() => setCustomQuality((prev) => !prev)}
                        className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${
                          customQuality ? '' : 'bg-gray-300'
                        }`}
                        style={customQuality ? { backgroundColor: AMBER } : undefined}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-stone-900 rounded-full shadow transition-transform ${
                            customQuality ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {customQuality ? (
                    <>
                      <p className="text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">Resolution</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        {RESOLUTIONS.map((option) => {
                          const isSelected = resolution === option.id;
                          return (
                            <button
                              key={option.id}
                              onClick={() => setResolution(option.id)}
                              className={`p-3 rounded-lg border text-left transition-colors ${
                                isSelected ? 'text-white border-transparent' : 'border-gray-200 dark:border-stone-700 hover:bg-gray-50 dark:hover:bg-stone-800'
                              }`}
                              style={isSelected ? { backgroundColor: ACCENT } : undefined}
                            >
                              <p className="font-semibold text-sm">{option.label}</p>
                              <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-stone-400'}`}>
                                {option.note}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      <SelectField
                        label="Aspect Ratio"
                        value={aspectRatio}
                        onChange={setAspectRatio}
                        options={['16:9', '9:16', '1:1', '4:3', '21:9', 'auto']}
                      />
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700 dark:text-stone-300 mb-3">
                        Choose Quality Preset
                      </p>
                      <div className="space-y-3">
                        {QUALITY_PRESETS.map((preset) => {
                          const isSelected = qualityPresetId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              onClick={() => handleSelectPreset(preset)}
                              className={`w-full text-left p-4 rounded-xl border transition-colors ${
                                isSelected
                                  ? 'bg-[rgb(193,88,58)]/5'
                                  : 'border-gray-200 dark:border-stone-700 hover:bg-gray-50 dark:hover:bg-stone-800'
                              }`}
                              style={isSelected ? { borderColor: ACCENT } : undefined}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-gray-800 dark:text-stone-100">{preset.name}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${preset.badgeClass}`}
                                  >
                                    {preset.badge}
                                  </span>
                                  {preset.tier === 'recommended' && (
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500 text-white">
                                      Recommended
                                    </span>
                                  )}
                                  {preset.tier === 'premium' && (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white"
                                      style={{ backgroundColor: AMBER }}
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      Premium
                                    </span>
                                  )}
                                </div>
                                {preset.flash && (
                                  <Zap
                                    className="w-4 h-4 flex-shrink-0"
                                    style={{ color: AMBER }}
                                  />
                                )}
                              </div>

                              <p className="text-sm text-gray-600 dark:text-stone-300 mb-3">{preset.description}</p>

                              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                                <div className="space-y-1.5">
                                  <QualityStat label="Resolution" value={preset.resolution} />
                                  <QualityStat label="Frame Rate" value={preset.frameRate} />
                                  <QualityStat label="Codec" value={preset.codec} />
                                </div>
                                <div className="space-y-1.5">
                                  <QualityStat label="Size" value={preset.size} />
                                  <QualityStat label="Time" value={preset.time} />
                                  <QualityStat label="Quality" value={preset.quality} />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-xs text-gray-500 dark:text-stone-400 mt-4">
                        Videos are generated at up to the model&apos;s maximum of 4K. Higher presets
                        are rendered at the nearest supported resolution.
                      </p>
                    </>
                  )}

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-stone-300">
                        {t('videoCreator.clipLength')}
                      </label>
                      <span className="text-sm text-gray-600 dark:text-stone-300">{clipLength}s</span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={15}
                      value={clipLength}
                      onChange={(e) => setClipLength(Number(e.target.value))}
                      className="w-full accent-[rgb(193,88,58)]"
                    />
                    <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
                      Seedance generates 4-15 seconds per clip. Default is 10 seconds.
                    </p>
                  </div>
                </>
              )}

              {activeTab === 'background' && (
                <>
                  <div className="flex items-center gap-2 mb-5">
                    <Palette className="w-4 h-4" style={{ color: 'rgb(112,130,56)' }} />
                    <h2 className="font-semibold text-gray-800 dark:text-stone-100">{t('videoCreator.background')}</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setBackgroundPreset('')}
                      className="relative aspect-[4/3] overflow-hidden rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)]/40 bg-gray-100 dark:bg-stone-800"
                      style={{
                        borderColor: backgroundPreset === '' ? ACCENT : 'transparent',
                      }}
                    >
                      <span className="relative z-10 flex h-full items-center justify-center text-sm sm:text-base font-semibold text-gray-700 dark:text-stone-200">
                        None
                      </span>
                    </button>
                    {BACKGROUND_PRESETS.map((preset) => {
                      const isSelected = backgroundPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            setBackgroundPreset((prev) => (prev === preset.id ? '' : preset.id))
                          }
                          className="relative aspect-[4/3] overflow-hidden rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)]/40"
                          style={{
                            borderColor: isSelected ? ACCENT : 'transparent',
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-stone-500 to-stone-700" />
                          <img
                            src={preset.image}
                            alt={preset.label}
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/35" />
                          <span className="relative z-10 flex h-full items-center justify-center text-sm sm:text-base font-semibold text-white drop-shadow">
                            {preset.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {activeTab === 'lighting' && (
                <>
                  <div className="flex items-center gap-2 mb-6">
                    <Sun className="w-4 h-4" style={{ color: AMBER }} />
                    <h2 className="font-semibold text-gray-800 dark:text-stone-100">{t('videoCreator.lighting')}</h2>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-stone-300">Brightness</label>
                      <span className="text-sm text-gray-600 dark:text-stone-300">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[rgb(230,168,77)]"
                      style={{
                        background: `linear-gradient(to right, ${AMBER} 0%, ${AMBER} ${brightness}%, #e8dfd0 ${brightness}%, #e8dfd0 100%)`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {(['Warm', 'Cool'] as const).map((mode) => {
                      const isSelected = lightingMode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() =>
                            setLightingMode((prev) => (prev === mode ? null : mode))
                          }
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${
                            isSelected
                              ? 'text-white border-transparent'
                              : 'bg-[#f5f0e6] dark:bg-stone-800 border-gray-200 dark:border-stone-700 text-gray-700 dark:text-stone-300 hover:bg-[#efe9dc] dark:bg-stone-800 dark:hover:bg-stone-700'
                          }`}
                          style={isSelected ? { backgroundColor: ACCENT } : undefined}
                        >
                          {mode === 'Warm' ? (
                            <Sun className="w-4 h-4" />
                          ) : (
                            <Moon className="w-4 h-4" />
                          )}
                          <span>{mode}</span>
                        </button>
                      );
                    })}
                  </div>

                  <SelectField
                    label="Time of Day"
                    value={timeOfDay}
                    onChange={setTimeOfDay}
                    options={TIME_OF_DAY_OPTIONS}
                    allowNone
                  />
                </>
              )}

              {activeTab === 'character' && (
                <>
                  <div className="flex items-center gap-2 mb-5">
                    <User className="w-4 h-4" style={{ color: 'rgb(112,130,56)' }} />
                    <h2 className="font-semibold text-gray-800 dark:text-stone-100">{t('videoCreator.character')}</h2>
                  </div>

                  <p className="text-sm font-medium text-gray-700 dark:text-stone-300 mb-3">Character Style</p>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setCharacterStyle('')}
                      className={`relative w-full text-left p-4 rounded-xl border transition-colors ${
                        characterStyle === ''
                          ? 'bg-[rgb(193,88,58)]/5'
                          : 'border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-gray-50 dark:hover:bg-stone-800'
                      }`}
                      style={characterStyle === '' ? { borderColor: ACCENT } : undefined}
                    >
                      <p className="font-semibold text-gray-800 dark:text-stone-100">None</p>
                      <p className="text-sm text-gray-600 dark:text-stone-300 mt-0.5">
                        Let the model infer characters from the text
                      </p>
                    </button>
                    {CHARACTER_STYLES.map((style) => {
                      const isSelected = characterStyle === style.id;
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() =>
                            setCharacterStyle((prev) => (prev === style.id ? '' : style.id))
                          }
                          className={`relative w-full text-left p-4 rounded-xl border transition-colors ${
                            isSelected
                              ? 'bg-[rgb(193,88,58)]/5'
                              : 'border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-gray-50 dark:hover:bg-stone-800'
                          }`}
                          style={isSelected ? { borderColor: ACCENT } : undefined}
                        >
                          {isSelected && (
                            <span
                              className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: ACCENT }}
                              aria-hidden
                            />
                          )}
                          <p className="font-semibold text-gray-800 dark:text-stone-100 pr-6">{style.label}</p>
                          <p className="text-sm text-gray-600 dark:text-stone-300 mt-0.5">{style.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Right column */}
          <section className="@3xl:col-span-2 @4xl:col-span-1 grid grid-cols-1 @3xl:grid-cols-2 @4xl:grid-cols-1 gap-4">
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Volume2 className="w-4 h-4" style={{ color: 'rgb(112,130,56)' }} />
                <h2 className="font-semibold text-gray-800 dark:text-stone-100">{t('videoCreator.voice')}</h2>
              </div>

              <p className="text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">Voice Style</p>
              <div className="space-y-2">
                <div
                  onClick={() => setSelectedVoiceId('')}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedVoiceId === ''
                      ? 'bg-[rgb(193,88,58)]/5'
                      : 'border-gray-200 dark:border-stone-700 hover:bg-gray-50 dark:hover:bg-stone-800'
                  }`}
                  style={selectedVoiceId === '' ? { borderColor: ACCENT } : undefined}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-stone-100 leading-tight">
                      None
                    </p>
                    <p className="text-xs text-gray-500 dark:text-stone-400">
                      No spoken voice-over
                    </p>
                  </div>
                </div>
                {VOICES.map((voice) => {
                  const isSelected = selectedVoiceId === voice.id;
                  return (
                    <div
                      key={voice.id}
                      onClick={() =>
                        setSelectedVoiceId((prev) => (prev === voice.id ? '' : voice.id))
                      }
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? 'bg-[rgb(193,88,58)]/5' : 'border-gray-200 dark:border-stone-700 hover:bg-gray-50 dark:hover:bg-stone-800'
                      }`}
                      style={isSelected ? { borderColor: ACCENT } : undefined}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-stone-100 leading-tight">
                          {voice.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-stone-400">{voice.accent}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewVoice(voice.id);
                        }}
                        className="p-1.5 rounded-md text-gray-500 dark:text-stone-400 hover:text-gray-800 dark:text-stone-100 hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors flex-shrink-0"
                        aria-label={`Preview ${voice.name}`}
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 p-4 shadow-sm">
              <h2 className="font-semibold text-gray-800 dark:text-stone-100 mb-4">{t('videoCreator.generate')}</h2>

              <dl className="space-y-2 text-sm mb-4">
                <SummaryRow label="Quality" value={resolution === '4k' ? '4K' : resolution} />
                <SummaryRow label="Clip length" value={`${clipLength}s`} />
                <SummaryRow
                  label="Background"
                  value={backgroundPreset || 'Not set'}
                />
                <SummaryRow
                  label="Lighting"
                  value={
                    lightingMode || timeOfDay
                      ? [lightingMode, timeOfDay].filter(Boolean).join(', ')
                      : 'Not set'
                  }
                />
                <SummaryRow label="Character" value={characterStyle || 'Not set'} />
                <SummaryRow
                  label="Voice"
                  value={
                    VOICES.find((v) => v.id === selectedVoiceId)?.name.split(' - ')[0] ||
                    narrationVoice ||
                    'Not set'
                  }
                />
                <SummaryRow label="Size" value={`~${estimatedSizeMb}MB`} />
                <SummaryRow label="Time" value="2-5 minutes" />
                <SummaryRow label="Format" value="MP4" />
                {estimatedCost && <SummaryRow label="Est. cost" value={`$${estimatedCost}`} />}
              </dl>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: AMBER }}
              >
                <Play className="w-4 h-4" />
                <span>
                  {isGenerating
                    ? job?.status === 'queued'
                      ? t('videoCreator.queued')
                      : t('videoCreator.generating')
                    : t('videoCreator.generateBtn')}
                </span>
              </button>

              <p className="text-xs text-gray-500 dark:text-stone-400 text-center mt-2">
                {t('videoCreator.notifyReady')}
              </p>

              {job && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-stone-700">
                  {job.status === 'completed' && job.resultJournalId ? (
                    <button
                      onClick={() => router.push(`/journals/${job.resultJournalId}`)}
                      className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: ACCENT }}
                    >
                      {t('videoCreator.openVideo')}
                    </button>
                  ) : (
                    <p
                      className={`text-xs text-center ${
                        job.status === 'failed' ? 'text-red-600' : 'text-gray-600 dark:text-stone-300'
                      }`}
                    >
                      {job.status === 'failed'
                        ? job.error || 'Video generation failed'
                        : 'Generation in progress. You can keep working.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {selectedScene?.text && (
              <div className="bg-white dark:bg-stone-900 rounded-xl border border-gray-200 dark:border-stone-700 p-4 shadow-sm">
                <h2 className="font-semibold text-gray-800 dark:text-stone-100 mb-2 text-sm">
                  {selectedScene.label}
                </h2>
                <p className="text-xs text-gray-600 dark:text-stone-300 leading-relaxed line-clamp-6">
                  {selectedScene.text}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  allowNone = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allowNone?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-lg text-sm text-gray-800 dark:text-stone-100 bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)]/40"
      >
        {allowNone && <option value="">None</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-stone-100">{label}</p>
        <p className="text-xs text-gray-500 dark:text-stone-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${
          checked ? '' : 'bg-gray-300'
        }`}
        style={checked ? { backgroundColor: AMBER } : undefined}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-stone-900 rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function QualityStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-gray-500 dark:text-stone-400">{label}:</span>
      <span className="font-medium text-gray-800 dark:text-stone-100">{value}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-600 dark:text-stone-300">{label}</dt>
      <dd className="font-medium text-gray-800 dark:text-stone-100">{value}</dd>
    </div>
  );
}
