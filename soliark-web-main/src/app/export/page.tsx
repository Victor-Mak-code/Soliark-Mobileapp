'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Download,
  FileText,
  Image as ImageIcon,
  Instagram,
  Link as LinkIcon,
  Mail,
  Share2,
  Video,
  Youtube,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/components/ToastContext';
import { useI18n } from '@/i18n/I18nProvider';
import { getJournals, type Journal } from '@/lib/api';
import {
  downloadViaAnchor,
  filenameFromUrl,
  getJournalAsFile,
  getJournalFileUrl,
  isDocJournal,
  isShareableJournal,
  platformAllowsJournal,
  shareToPlatform,
  textJournalFile,
  triggerDownload,
  type SocialPlatformId,
} from '@/lib/socialShare';

const AMBER = 'rgb(230,168,77)';
const GREEN = 'rgb(112,130,56)';
const RECENT_STORAGE_KEY = 'soliark-recent-exports';
const MAX_RECENT = 12;

type FormatId = 'text' | 'photo' | 'video';

interface FormatOption {
  id: FormatId;
  title: string;
  description: string;
  types: string[];
  iconBg: string;
  iconColor: string;
  icon: typeof FileText;
}

const EXPORT_FORMATS: FormatOption[] = [
  {
    id: 'text',
    title: 'Text',
    description: 'Download documents and write-ups.',
    types: ['PDF', 'DOCX', 'TXT'],
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    icon: FileText,
  },
  {
    id: 'photo',
    title: 'Photo',
    description: 'Share or download image journals.',
    types: ['PNG', 'JPG'],
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    icon: ImageIcon,
  },
  {
    id: 'video',
    title: 'Video',
    description: 'Share or download video journals.',
    types: ['MP4', 'MOV'],
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    icon: Video,
  },
];

const SOCIAL_PLATFORMS: {
  id: SocialPlatformId;
  name: string;
  specs: string;
  iconBg: string;
  icon: typeof Youtube | typeof Instagram | null;
}[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    specs: 'Video only • MP4',
    iconBg: 'bg-red-600',
    icon: Youtube,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    specs: 'Photos and videos • MP4/JPG',
    iconBg: 'bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600',
    icon: Instagram,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    specs: 'Video only • MP4',
    iconBg: 'bg-stone-900',
    icon: null,
  },
];

interface RecentExport {
  id: string;
  journalId?: string;
  title: string;
  kind: 'video' | 'image' | 'document';
  meta: string;
  fileUrl?: string | null;
}

function matchesFormat(journal: Journal, format: FormatId): boolean {
  if (journal.type === 'audio') return false;
  if (format === 'photo') return journal.type === 'image';
  if (format === 'video') return journal.type === 'video';
  return isDocJournal(journal);
}

function recentKind(journal: Journal): RecentExport['kind'] {
  if (journal.type === 'video') return 'video';
  if (journal.type === 'image') return 'image';
  return 'document';
}

function loadRecent(): RecentExport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentExport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecent(items: RecentExport[]) {
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M14.5 3c.4 2.4 1.8 4.3 4.2 4.8v3.1c-1.5.1-2.9-.3-4.2-1.1v6.6c0 3.4-2.7 6.1-6.2 6.1S2 19.8 2 16.4s2.8-6.2 6.3-6.2c.3 0 .7 0 1 .1v3.2c-.3-.1-.7-.2-1-.2-1.7 0-3.1 1.4-3.1 3.1s1.4 3.1 3.1 3.1 3.1-1.4 3.1-3.1V3h3.1Z" />
    </svg>
  );
}

function RecentIcon({ kind }: { kind: RecentExport['kind'] }) {
  const Icon = kind === 'image' ? ImageIcon : kind === 'video' ? Video : FileText;
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
      <Icon className="h-5 w-5" />
    </div>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-stone-500 dark:text-stone-400">{label}</span>
      <span className="font-semibold text-stone-800 dark:text-stone-100">{value}</span>
    </div>
  );
}

export default function ExportPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<FormatId>('video');
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loadingJournals, setLoadingJournals] = useState(true);
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);
  const [recentExports, setRecentExports] = useState<RecentExport[]>([]);
  const [busy, setBusy] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [quality, setQuality] = useState('High');
  const [resolution, setResolution] = useState('1920x1080');
  const [watermark, setWatermark] = useState('Disabled');
  const [privacy, setPrivacy] = useState('Private');

  const currentFormat = useMemo(
    () => EXPORT_FORMATS.find((format) => format.id === selectedFormat) ?? EXPORT_FORMATS[2],
    [selectedFormat]
  );

  const filteredJournals = useMemo(
    () => journals.filter((journal) => matchesFormat(journal, selectedFormat)),
    [journals, selectedFormat]
  );

  const selectedJournal = useMemo(
    () => filteredJournals.find((journal) => journal._id === selectedJournalId) ?? null,
    [filteredJournals, selectedJournalId]
  );

  useEffect(() => {
    setRecentExports(loadRecent());
    let cancelled = false;
    getJournals()
      .then((response) => {
        if (cancelled) return;
        const list = Array.isArray(response.data) ? response.data.filter((journal) => journal.type !== 'audio') : [];
        setJournals(list);
      })
      .catch(() => {
        if (!cancelled) toast('Failed to load journals', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoadingJournals(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (filteredJournals.length === 0) {
      setSelectedJournalId(null);
      return;
    }
    setSelectedJournalId((current) =>
      current && filteredJournals.some((journal) => journal._id === current)
        ? current
        : filteredJournals[0]._id
    );
  }, [filteredJournals]);

  const recordRecent = useCallback((journal: Journal) => {
    const entry: RecentExport = {
      id: `export-${Date.now()}`,
      journalId: journal._id,
      title: journal.title || 'Untitled',
      kind: recentKind(journal),
      meta: `${journal.type.toUpperCase()} • Just now`,
      fileUrl: getJournalFileUrl(journal),
    };
    setRecentExports((prev) => {
      const next = [entry, ...prev];
      saveRecent(next);
      return next.slice(0, MAX_RECENT);
    });
  }, []);

  const downloadJournal = useCallback(
    async (journal: Journal) => {
      try {
        const file = await getJournalAsFile(journal);
        triggerDownload(file);
      } catch {
        const fileUrl = getJournalFileUrl(journal);
        if (fileUrl) {
          downloadViaAnchor(fileUrl, filenameFromUrl(fileUrl, journal.title || 'export'));
          return;
        }
        if (journal.type === 'text') {
          triggerDownload(textJournalFile(journal));
          return;
        }
        throw new Error('This item has no file to download.');
      }
    },
    []
  );

  const requireJournal = (): Journal | null => {
    if (!selectedJournal) {
      toast(`Select a ${currentFormat.title.toLowerCase()} journal first.`, 'info');
      return null;
    }
    return selectedJournal;
  };

  const handleExport = async () => {
    const journal = requireJournal();
    if (!journal) return;
    setBusy(true);
    try {
      await downloadJournal(journal);
      recordRecent(journal);
      toast(`${journal.title || currentFormat.title} saved to your device`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Export failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async (platform: SocialPlatformId, platformName: string) => {
    const journal = requireJournal();
    if (!journal) return;

    if (!isShareableJournal(journal)) {
      toast('Only photos and videos can be shared to social media. Download documents instead.', 'info');
      return;
    }
    if (!platformAllowsJournal(platform, journal)) {
      toast(`${platformName} only accepts videos.`, 'info');
      return;
    }

    setBusy(true);
    try {
      const outcome = await shareToPlatform(platform, journal);
      if (outcome === 'cancelled') return;
      recordRecent(journal);
      if (outcome === 'shared') {
        toast(`Shared to ${platformName}`, 'success');
      } else {
        toast(`File downloaded. Finish the upload in the ${platformName} tab.`, 'success');
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : `Could not share to ${platformName}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveToDevice = () => {
    void handleExport();
  };

  const handleCopyLink = async () => {
    const journal = requireJournal();
    if (!journal) return;
    const fileUrl = getJournalFileUrl(journal);
    if (!fileUrl) {
      toast('This journal has no file link to copy.', 'info');
      return;
    }
    try {
      await navigator.clipboard.writeText(fileUrl);
      toast('Share link copied', 'success');
    } catch {
      toast('Could not copy link', 'error');
    }
  };

  const handleEmail = () => {
    const journal = requireJournal();
    if (!journal) return;
    const fileUrl = getJournalFileUrl(journal);
    const title = journal.title || currentFormat.title;
    const subject = encodeURIComponent(`Soliark export: ${title}`);
    const body = encodeURIComponent(
      fileUrl
        ? `Here's my ${currentFormat.title.toLowerCase()} export from Soliark:\n\n${fileUrl}`
        : `Here's my ${currentFormat.title.toLowerCase()} export from Soliark:\n\n${(journal.content || '').slice(0, 2000)}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleRecentDownload = async (item: RecentExport) => {
    const journal = item.journalId ? journals.find((entry) => entry._id === item.journalId) : undefined;
    setBusy(true);
    try {
      if (journal) {
        await downloadJournal(journal);
      } else if (item.fileUrl) {
        downloadViaAnchor(item.fileUrl, filenameFromUrl(item.fileUrl, item.title));
      } else {
        toast('That export is no longer available.', 'info');
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Download failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-stone-800 dark:text-stone-100 sm:text-3xl">{t('export.title')}</h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 sm:text-base">
            {t('export.subtitle')}
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">{t('export.format')}</h2>

              {EXPORT_FORMATS.map((format) => {
                const selected = format.id === selectedFormat;
                const Icon = format.icon;
                const count = journals.filter((journal) => matchesFormat(journal, format.id)).length;
                return (
                  <button
                    key={format.id}
                    type="button"
                    onClick={() => setSelectedFormat(format.id)}
                    className={`relative w-full rounded-xl border bg-white dark:bg-stone-900 p-4 text-left shadow-sm transition-shadow hover:shadow-md sm:p-5 ${
                      selected ? 'border-[rgb(230,168,77)]' : 'border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {selected && (
                      <span
                        className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: AMBER }}
                      />
                    )}
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${format.iconBg}`}
                      >
                        <Icon className={`h-5 w-5 ${format.iconColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-stone-800 dark:text-stone-100">{format.title}</h3>
                        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{format.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {format.types.map((type) => (
                            <span
                              key={type}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                selected
                                  ? 'bg-stone-800 text-white'
                                  : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                              }`}
                            >
                              {type}
                            </span>
                          ))}
                          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                            {count} {count === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>

            <section className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 shadow-sm sm:p-5">
              <h2 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-200">
                Choose a {currentFormat.title.toLowerCase()} journal
              </h2>
              {loadingJournals ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">Loading journals...</p>
              ) : filteredJournals.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  No {currentFormat.title.toLowerCase()} journals yet.
                  {selectedFormat !== 'text' ? ' Create one in Journals or Video Creator first.' : ''}
                </p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {filteredJournals.map((journal) => {
                    const selected = journal._id === selectedJournalId;
                    return (
                      <li key={journal._id}>
                        <button
                          type="button"
                          onClick={() => setSelectedJournalId(journal._id)}
                          className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                            selected
                              ? 'border-[rgb(230,168,77)] bg-[#f8f1e4] dark:bg-stone-800'
                              : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
                          }`}
                        >
                          <p className="truncate font-medium text-stone-800 dark:text-stone-100">
                            {journal.title || 'Untitled'}
                          </p>
                          <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                            {new Date(journal.createdAt).toLocaleDateString()}
                            {isShareableJournal(journal) ? ' • Can share to social' : ' • Download only'}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={busy || !selectedJournal}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: GREEN }}
            >
              <Download className="h-4 w-4" />
              Export {currentFormat.title}
            </button>

            <section className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 shadow-sm sm:p-5">
              <h2 className="mb-4 text-sm font-semibold text-stone-600 dark:text-stone-300">Recent Exports</h2>
              {recentExports.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">Exported files will show up here.</p>
              ) : (
                <ul className="space-y-3">
                  {recentExports.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-3"
                    >
                      <RecentIcon kind={item.kind} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-800 dark:text-stone-100">{item.title}</p>
                        <p className="truncate text-xs text-stone-500 dark:text-stone-400">{item.meta}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRecentDownload(item)}
                        className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                        aria-label={`Download ${item.title}`}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Share2 className="h-4 w-4 text-stone-500 dark:text-stone-400" />
                <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Social Platforms</h2>
              </div>
              {selectedFormat === 'text' && (
                <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
                  Documents can be downloaded or emailed. Social share is for photos and videos.
                </p>
              )}
              <ul className="space-y-3">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  const allowed = selectedJournal ? platformAllowsJournal(platform.id, selectedJournal) : false;
                  const disabled = busy || !selectedJournal || !allowed;
                  return (
                    <li
                      key={platform.id}
                      className="flex items-center gap-3 rounded-xl border border-stone-100 py-1 dark:border-stone-800"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${platform.iconBg}`}
                      >
                        {Icon ? <Icon className="h-5 w-5" /> : <TikTokIcon className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{platform.name}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">{platform.specs}</p>
                      </div>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void handleShare(platform.id, platform.name)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ backgroundColor: AMBER }}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 shadow-sm sm:p-5">
              <h2 className="mb-4 text-sm font-semibold text-stone-800 dark:text-stone-100">Quick Actions</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <QuickActionButton icon={<Download className="h-4 w-4" />} onClick={handleSaveToDevice} disabled={busy}>
                  Save to Device
                </QuickActionButton>
                <QuickActionButton icon={<LinkIcon className="h-4 w-4" />} onClick={() => void handleCopyLink()}>
                  Copy Share Link
                </QuickActionButton>
                <QuickActionButton
                  icon={<Mail className="h-4 w-4" />}
                  onClick={handleEmail}
                  className="sm:col-span-2"
                >
                  Email as Attachment
                </QuickActionButton>
              </div>
            </section>

            <section className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 shadow-sm sm:p-5">
              <h2 className="mb-2 text-sm font-semibold text-stone-800 dark:text-stone-100">Export Settings</h2>
              {editingSettings ? (
                <div className="space-y-3">
                  <SettingSelect
                    label="Quality"
                    value={quality}
                    options={['Standard', 'High', 'Maximum']}
                    onChange={setQuality}
                  />
                  <SettingSelect
                    label="Resolution"
                    value={resolution}
                    options={['1280x720', '1920x1080', '1080x1080', '1080x1920']}
                    onChange={setResolution}
                  />
                  <SettingSelect
                    label="Watermark"
                    value={watermark}
                    options={['Disabled', 'Enabled']}
                    onChange={setWatermark}
                  />
                  <SettingSelect
                    label="Privacy"
                    value={privacy}
                    options={['Private', 'Unlisted', 'Public']}
                    onChange={setPrivacy}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSettings(false);
                      toast('Export settings saved', 'success');
                    }}
                    className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                    style={{ backgroundColor: GREEN }}
                  >
                    Save Settings
                  </button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    <SettingsRow label="Quality" value={quality} />
                    <SettingsRow label="Resolution" value={resolution} />
                    <SettingsRow label="Watermark" value={watermark} />
                    <SettingsRow label="Privacy" value={privacy} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingSettings(true)}
                    className="mt-4 w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-[#f3ead9] px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-[#eee2cc] dark:bg-stone-800 dark:text-stone-200"
                  >
                    Customize Settings
                  </button>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function QuickActionButton({
  icon,
  children,
  onClick,
  className = '',
  disabled = false,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800 ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

function SettingSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-stone-500 dark:text-stone-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-800 focus:border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
