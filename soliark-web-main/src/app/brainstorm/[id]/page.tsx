'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import DashboardLayout from '@/components/DashboardLayout';
import { useI18n } from '@/i18n/I18nProvider';
import {
  getBrainstormSpace,
  addBrainstormEntry,
  uploadAsset,
  generateBrainstormEntryVideo,
  getBrainstormVideoJob,
  voteBrainstormEntry,
  promoteBrainstormSpaceToIdea,
  getFileUrl,
  API_BASE_URL,
  type BrainstormSpace,
  type BrainstormEntryItem,
} from '@/lib/api';
import { Heart, ImageIcon, Sparkles, Send } from 'lucide-react';

export default function BrainstormSpacePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();

  const [space, setSpace] = useState<BrainstormSpace | null>(null);
  const [entries, setEntries] = useState<BrainstormEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composerText, setComposerText] = useState('');
  const [posting, setPosting] = useState(false);
  const [generatingEntryId, setGeneratingEntryId] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [promoteDescription, setPromoteDescription] = useState('');
  const [promoteCategory, setPromoteCategory] = useState('');
  const [promoting, setPromoting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pollTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getBrainstormSpace(id);
      setSpace(data.space);
      setEntries(data.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load space');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = io(API_BASE_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.emit('join-brainstorm-space', id);
    socket.on('connect', () => {
      setLiveConnected(true);
      socket.emit('join-brainstorm-space', id);
    });
    socket.on('disconnect', () => setLiveConnected(false));
    socket.on('brainstorm:entry', () => load());
    socket.on('brainstorm:vote', (payload: { entryId: string; voteCount: number }) => {
      setEntries((prev) =>
        prev.map((e) => (e._id === payload.entryId ? { ...e, voteCount: payload.voteCount } : e))
      );
    });

    return () => {
      socket.emit('leave-brainstorm-space', id);
      socket.close();
    };
  }, [id, load]);

  useEffect(() => {
    return () => {
      Object.values(pollTimers.current).forEach(clearTimeout);
    };
  }, []);

  const handlePostText = async () => {
    if (!composerText.trim()) return;
    setPosting(true);
    setError('');
    try {
      await addBrainstormEntry(id, { type: 'text', content: composerText.trim() });
      setComposerText('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const kind = file.type.startsWith('video') ? 'video' : 'image';
    setPosting(true);
    setError('');
    try {
      const uploaded = await uploadAsset(file, kind);
      if (uploaded.data) {
        await addBrainstormEntry(id, { type: kind, content: uploaded.data.fileUrl });
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload');
    } finally {
      setPosting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const pollVideoJob = useCallback(
    (jobId: string, attempt = 0) => {
      if (attempt > 30) return;
      pollTimers.current[jobId] = setTimeout(async () => {
        try {
          const job = await getBrainstormVideoJob(id, jobId);
          if (job.status === 'completed' || job.status === 'failed') {
            setGeneratingEntryId(null);
            if (job.status === 'completed') await load();
            if (job.status === 'failed') setError(job.error || 'Video generation failed');
            return;
          }
          pollVideoJob(jobId, attempt + 1);
        } catch {
          setGeneratingEntryId(null);
        }
      }, 4000);
    },
    [id, load]
  );

  const handleGenerateVideo = async (entryId: string) => {
    setGeneratingEntryId(entryId);
    setError('');
    try {
      const job = await generateBrainstormEntryVideo(id, entryId);
      if (job.status === 'completed') {
        setGeneratingEntryId(null);
        await load();
      } else {
        pollVideoJob(job.id);
      }
    } catch (err) {
      setGeneratingEntryId(null);
      setError(err instanceof Error ? err.message : 'Failed to start video generation');
    }
  };

  const handleVote = async (entryId: string) => {
    try {
      const result = await voteBrainstormEntry(id, entryId);
      setEntries((prev) =>
        prev.map((e) =>
          e._id === entryId ? { ...e, voteCount: result.voteCount, votedByMe: result.votedByMe } : e
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vote');
    }
  };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!space) return;
    setPromoting(true);
    setError('');
    try {
      await promoteBrainstormSpaceToIdea(id, {
        title: space.title,
        description: promoteDescription,
        category: promoteCategory,
      });
      setShowPromote(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote to idea');
    } finally {
      setPromoting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="theme-ideas min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8 max-w-2xl mx-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-10 w-10 rounded-full border-2 border-[var(--ideas-purple)] border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && space && (
            <>
              <div className="flex items-start justify-between gap-4 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)]">
                  {space.title}
                </h1>
                {liveConnected && (
                  <span className="flex items-center gap-1.5 text-xs text-[var(--ideas-green)] shrink-0 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ideas-green)] animate-pulse" />
                    {t('brainstorm.space.liveNow')}
                  </span>
                )}
              </div>

              {!space.ideaId && (
                <button
                  onClick={() => setShowPromote(true)}
                  className="text-sm font-medium text-[var(--ideas-purple)] mb-4"
                >
                  {t('brainstorm.space.promote')}
                </button>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
                  {error}
                </div>
              )}

              <div className="bg-[var(--ideas-card)] border border-[var(--ideas-border)] rounded-xl p-4 mb-6">
                <textarea
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder={t('brainstorm.space.composerPlaceholder')}
                  rows={3}
                  className="w-full bg-transparent text-sm focus:outline-none resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-lg hover:bg-[var(--ideas-card2)] text-[var(--ideas-muted)]"
                      aria-label={t('brainstorm.space.addPhoto')}
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleFileSelected}
                    />
                  </div>
                  <button
                    onClick={handlePostText}
                    disabled={posting || !composerText.trim()}
                    className="px-4 py-2 rounded-lg bg-[var(--ideas-purple)] text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {t('brainstorm.space.addText')}
                  </button>
                </div>
              </div>

              {entries.length === 0 && (
                <p className="text-sm text-[var(--ideas-muted)] text-center py-8">
                  {t('brainstorm.space.noEntries')}
                </p>
              )}

              <div className="space-y-4">
                {entries.map((entry) => (
                  <div key={entry._id} className="bg-[var(--ideas-card)] border border-[var(--ideas-border)] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-[var(--ideas-purple)] text-white text-xs font-bold flex items-center justify-center">
                        {(entry.author.firstName?.[0] || '?').toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">
                        {entry.author.firstName} {entry.author.lastName}
                      </span>
                    </div>

                    {entry.type === 'text' && <p className="text-sm leading-relaxed">{entry.content}</p>}
                    {entry.type === 'image' && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getFileUrl(entry.content)} alt="" className="rounded-lg max-h-80 w-auto" />
                    )}
                    {(entry.type === 'video' || entry.type === 'ai_video') && (
                      <video src={getFileUrl(entry.content)} controls className="rounded-lg max-h-80 w-full bg-black" />
                    )}

                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--ideas-border)]">
                      <button
                        onClick={() => handleVote(entry._id)}
                        className={`flex items-center gap-1.5 text-xs font-medium ${
                          entry.votedByMe ? 'text-[var(--ideas-coral)]' : 'text-[var(--ideas-muted)]'
                        }`}
                      >
                        <Heart className="w-3.5 h-3.5" fill={entry.votedByMe ? 'currentColor' : 'none'} />
                        {entry.voteCount}
                      </button>
                      {entry.type === 'text' && (
                        <button
                          onClick={() => handleGenerateVideo(entry._id)}
                          disabled={generatingEntryId === entry._id}
                          className="flex items-center gap-1.5 text-xs font-medium text-[var(--ideas-purple)] disabled:opacity-50 ml-auto"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {generatingEntryId === entry._id
                            ? t('brainstorm.space.generating')
                            : t('brainstorm.space.generateVideo')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showPromote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="theme-ideas bg-[var(--ideas-card)] rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-[family-name:var(--font-display)] font-bold text-lg mb-4">
              {t('brainstorm.promote.title')}
            </h3>
            <form onSubmit={handlePromote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--ideas-muted)] mb-1.5">
                  {t('brainstorm.promote.descriptionLabel')}
                </label>
                <textarea
                  value={promoteDescription}
                  onChange={(e) => setPromoteDescription(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg bg-[var(--ideas-card2)] border border-[var(--ideas-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ideas-purple)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--ideas-muted)] mb-1.5">
                  {t('brainstorm.promote.categoryLabel')}
                </label>
                <input
                  type="text"
                  value={promoteCategory}
                  onChange={(e) => setPromoteCategory(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-[var(--ideas-card2)] border border-[var(--ideas-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ideas-purple)]"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={promoting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-[var(--ideas-purple)] text-white disabled:opacity-50"
                >
                  {promoting ? '...' : t('brainstorm.promote.submit')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPromote(false)}
                  className="px-4 py-2.5 rounded-lg bg-[var(--ideas-card2)] border border-[var(--ideas-border)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
