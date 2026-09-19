'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import TextToSpeechControls from '@/components/TextToSpeechControls';
import ShareJournalButton from '@/components/ShareJournalButton';
import VideoPromptGuidelines from '@/components/VideoPromptGuidelines';
import {
  getJournal,
  updateJournal,
  deleteJournal,
  getFileUrl,
  getJournalVideoGeneration,
  getVideoGenerationById,
  type Journal,
  type VideoGenerationJob,
} from '@/lib/api';
import {
  canCreateVideoFromJournal,
  clearJournalVideoJob,
  getStoredJournalVideoJobId,
  isActiveVideoJob,
  saveJournalVideoJob,
  startJournalVideo,
} from '@/lib/journalVideo';
import WriteupEditor from '@/components/editor/WriteupEditor';
import WriteupViewer from '@/components/editor/WriteupViewer';
import { htmlToPlainText } from '@/components/editor/htmlUtils';

export default function JournalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const journalId = params.id as string;

  const [journal, setJournal] = useState<Journal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string>('');
  const [showTTS, setShowTTS] = useState(false);
  const [ttsText, setTtsText] = useState('');
  const [videoJob, setVideoJob] = useState<VideoGenerationJob | null>(null);
  const [isStartingVideo, setIsStartingVideo] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollInFlightRef = useRef(false);

  useEffect(() => {
    if (journalId) {
      setError('');
      setSuccess('');
      setVideoJob(null);
      fetchJournal();
      restoreVideoJob();
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [journalId]);

  useEffect(() => {
    if (!videoJob) return;

    if (videoJob.status === 'queued' || videoJob.status === 'processing' || videoJob.status === 'saving') {
      startPolling();
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [videoJob?.status, videoJob?.id]);

  const applyRestoredJob = (job: VideoGenerationJob) => {
    setVideoJob(job);
    if (isActiveVideoJob(job.status)) {
      saveJournalVideoJob(journalId, job.id);
      return;
    }
    clearJournalVideoJob(journalId);
    if (job.status === 'failed') {
      setError(job.error || 'Video generation failed');
    }
  };

  const fetchJournal = async () => {
    try {
      setLoading(true);
      const response = await getJournal(journalId);
      if (response.data) {
        const journalData = response.data as Journal;
        setJournal(journalData);
        setEditedTitle(journalData.title || '');
        setEditedContent(journalData.content);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load journal');
    } finally {
      setLoading(false);
    }
  };

  const restoreVideoJob = async () => {
    try {
      const storedJobId = getStoredJournalVideoJobId(journalId);
      if (storedJobId) {
        try {
          const stored = await getVideoGenerationById(storedJobId);
          if (stored.data) {
            applyRestoredJob(stored.data);
            return;
          }
        } catch {
          // Fall through to latest job for this journal
        }
      }

      const response = await getJournalVideoGeneration(journalId);
      if (response.data) {
        applyRestoredJob(response.data);
      }
    } catch {
      // Ignore restore errors; generation can still be started manually
    }
  };

  const startPolling = () => {
    if (pollRef.current) return;
    const jobId = videoJob?.id || getStoredJournalVideoJobId(journalId);
    if (!jobId) return;

    const tick = async () => {
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      try {
        const response = await getVideoGenerationById(jobId);
        if (!response.data) return;
        setVideoJob(response.data);
        if (isActiveVideoJob(response.data.status)) {
          saveJournalVideoJob(journalId, response.data.id);
          return;
        }
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        clearJournalVideoJob(journalId);
        if (response.data.status === 'completed') {
          setSuccess('Video created successfully');
        }
        if (response.data.status === 'failed') {
          setError(response.data.error || 'Video generation failed');
        }
      } catch {
        // Keep polling; a single failed GET must not drop a running job.
      } finally {
        pollInFlightRef.current = false;
      }
    };

    void tick();
    pollRef.current = setInterval(tick, 4000);
  };

  const handleCreateVideo = async () => {
    if (!journal || !canCreateVideoFromJournal(journal)) return;

    setIsStartingVideo(true);
    setError('');
    setSuccess('');

    try {
      const job = await startJournalVideo(journal);
      setVideoJob(job);
      if (isActiveVideoJob(job.status)) {
        saveJournalVideoJob(journal._id, job.id);
        setSuccess('Video generation started. This may take a few minutes.');
      } else if (job.status === 'completed') {
        clearJournalVideoJob(journal._id);
        setSuccess('Video created successfully');
      } else if (job.status === 'failed') {
        clearJournalVideoJob(journal._id);
        setError(job.error || 'Video generation failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start video generation');
    } finally {
      setIsStartingVideo(false);
    }
  };

  const handleSave = async () => {
    if (!journal) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateJournal(journal._id, {
        title: editedTitle.trim() || undefined,
        content: editedContent.trim(),
      });
      setSuccess('Journal updated successfully');
      setIsEditing(false);
      await fetchJournal();
    } catch (err: any) {
      setError(err.message || 'Failed to update journal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!journal) return;

    if (confirm('Are you sure you want to delete this journal? This action cannot be undone.')) {
      try {
        await deleteJournal(journal._id);
        router.push('/library');
      } catch (err: any) {
        setError(err.message || 'Failed to delete journal');
      }
    }
  };

  const handleCancel = () => {
    if (journal) {
      setEditedTitle(journal.title || '');
      setEditedContent(journal.content);
    }
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const handleListen = async () => {
    if (!journal) return;

    try {
      setError('');

      if (journal.type === 'text') {
        setTtsText(htmlToPlainText(journal.content));
        setShowTTS(true);
      } else {
        setError('Text-to-speech is only available for text journals');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to prepare text for reading');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'text':
        return 'Text';
      case 'audio':
        return 'Audio';
      case 'video':
        return 'Video';
      case 'pdf':
      case 'doc':
      case 'document':
        return 'Document';
      case 'image':
        return 'Image';
      default:
        return 'Text';
    }
  };

  const isVideoGenerating =
    isStartingVideo ||
    videoJob?.status === 'queued' ||
    videoJob?.status === 'processing' ||
    videoJob?.status === 'saving';

  const videoStatusLabel = (() => {
    if (!videoJob) return '';
    switch (videoJob.status) {
      case 'queued':
        return 'Video queued...';
      case 'processing':
      case 'saving':
        return 'Generating video...';
      case 'completed':
        return 'Video ready';
      case 'failed':
        return videoJob.error || 'Video generation failed';
      default:
        return '';
    }
  })();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(112,130,56)] mb-4"></div>
              <p className="text-gray-600 dark:text-stone-300">Loading journal...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !journal) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8">
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            <button
              onClick={() => router.push('/library')}
              className="px-4 py-2 bg-[rgb(112,130,56)] text-white rounded-lg hover:bg-[rgb(95,110,48)] transition-colors"
            >
              Back to Library
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!journal) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-600 dark:text-stone-300 hover:text-gray-800 dark:text-stone-100 transition-colors"
        >
          <span>←</span>
          <span className="text-sm sm:text-base">Back</span>
        </button>

        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="Enter title..."
                  className="w-full text-2xl sm:text-3xl font-bold text-gray-800 dark:text-stone-100 border-b-2 border-[rgb(112,130,56)] focus:outline-none pb-2 mb-2"
                />
              ) : (
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-stone-100 mb-2">
                  {journal.title || 'Untitled Journal'}
                </h1>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-stone-400">
                <span className="px-2 py-1 bg-[rgb(112,130,56)]/20 text-[rgb(112,130,56)] rounded">
                  {getTypeLabel(journal.type)}
                </span>
                <span>{formatDate(journal.createdAt)}</span>
                {journal.isStarred && <span className="text-red-500">★ Starred</span>}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
            {success}
          </div>
        )}

        {canCreateVideoFromJournal(journal) && videoJob && videoJob.status !== 'failed' && (
          <div className="mb-4 p-3 bg-[rgb(112,130,56)]/10 border border-[rgb(112,130,56)]/30 rounded-lg text-sm text-gray-700 dark:text-stone-300 flex flex-wrap items-center justify-between gap-3">
            <span>{videoStatusLabel}</span>
            {videoJob.status === 'completed' && videoJob.resultJournalId && (
              <button
                onClick={() => router.push(`/journals/${videoJob.resultJournalId}`)}
                className="px-3 py-1.5 bg-[rgb(112,130,56)] text-white rounded-lg hover:bg-[rgb(95,110,48)] transition-colors"
              >
                Open Video
              </button>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-stone-900 rounded-lg border-2 border-[rgb(112,130,56)]/30 p-4 sm:p-6 shadow-sm mb-6">
          {isEditing && journal.type === 'text' ? (
            <WriteupEditor
              value={editedContent}
              onChange={setEditedContent}
              placeholder="Write your journal entry here..."
              minHeightClass="min-h-[24rem]"
            />
          ) : (
            <>
              {journal.type === 'image' && journal.imageUrl && (
                <div className="mb-4">
                  <img
                    src={getFileUrl(journal.imageUrl)}
                    alt={journal.title || 'Uploaded image'}
                    className="max-w-full h-auto rounded-lg shadow-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300';
                      errorDiv.textContent = 'Failed to load image';
                      (e.target as HTMLImageElement).parentElement?.appendChild(errorDiv);
                    }}
                  />
                </div>
              )}

              {(journal.type === 'doc' || journal.type === 'pdf' || journal.type === 'document') && journal.documentUrl && (
                <div className="mb-4">
                  <div className="border border-gray-300 dark:border-stone-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-stone-800">
                    <div className="w-full h-[600px] sm:h-[800px]">
                      <iframe
                        src={`${getFileUrl(journal.documentUrl)}#toolbar=0`}
                        className="w-full h-full"
                        title={journal.title || 'Document viewer'}
                        style={{ border: 'none' }}
                        allow="fullscreen"
                      />
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-500 dark:text-stone-400 text-center space-y-2">
                    <a
                      href={getFileUrl(journal.documentUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-[rgb(112,130,56)] text-white rounded-lg hover:bg-[rgb(95,110,48)] transition-colors"
                    >
                      Open in new tab
                    </a>
                    <p className="text-xs text-gray-400 dark:text-stone-400 mt-2">
                      If the document doesn't display above, click the button to open it in a new tab
                    </p>
                  </div>
                </div>
              )}

              {journal.type === 'text' && <WriteupViewer content={journal.content} />}

              {journal.type === 'audio' && journal.audioUrl && (
                <div className="mb-4">
                  <audio controls className="w-full">
                    <source src={getFileUrl(journal.audioUrl)} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {journal.type === 'video' && journal.videoUrl && (
                <div className="mb-4">
                  <video controls className="w-full rounded-lg">
                    <source src={getFileUrl(journal.videoUrl)} />
                    Your browser does not support the video element.
                  </video>
                </div>
              )}
            </>
          )}

          {journal.type === 'text' && (
            <div className="mt-4 text-sm text-gray-500 dark:text-stone-400">
              {isEditing ? htmlToPlainText(editedContent).length : journal.characterCount} characters
            </div>
          )}
        </div>

        {showTTS && (
          <div className="mb-6">
            <TextToSpeechControls
              text={ttsText}
              onClose={() => setShowTTS(false)}
              autoPlay={true}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-[rgb(112,130,56)] text-white rounded-lg font-medium hover:bg-[rgb(95,110,48)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>💾</span>
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
              <button
                onClick={handleCancel}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-300 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <>
              {canCreateVideoFromJournal(journal) && (
                <div className="w-full mb-1">
                  <VideoPromptGuidelines />
                </div>
              )}
              {journal.type === 'text' && (
                <button
                  onClick={handleListen}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[rgb(112,130,56)]/20 text-[rgb(112,130,56)] rounded-lg font-medium hover:bg-[rgb(112,130,56)]/30 transition-colors flex items-center gap-2"
                >
                  <span>🔊</span>
                  <span>Listen</span>
                </button>
              )}
              {canCreateVideoFromJournal(journal) && (
                <button
                  onClick={handleCreateVideo}
                  disabled={isVideoGenerating}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[rgb(112,130,56)]/20 text-[rgb(112,130,56)] rounded-lg font-medium hover:bg-[rgb(112,130,56)]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>🎬</span>
                  <span>
                    {isVideoGenerating
                      ? videoJob?.status === 'queued'
                        ? 'Queued...'
                        : 'Generating...'
                      : 'Create Video'}
                  </span>
                </button>
              )}
              {canCreateVideoFromJournal(journal) && (
                <button
                  onClick={() => router.push(`/journals/${journal._id}/create-video`)}
                  disabled={isVideoGenerating}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[rgb(230,168,77)]/20 text-[rgb(193,88,58)] rounded-lg font-medium hover:bg-[rgb(230,168,77)]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>🎛️</span>
                  <span>Customize Video</span>
                </button>
              )}
              {(journal.type === 'text' ||
                journal.type === 'video' ||
                journal.type === 'audio' ||
                journal.type === 'image' ||
                journal.type === 'doc' ||
                journal.type === 'pdf' ||
                journal.type === 'document') && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-[rgb(112,130,56)] text-white rounded-lg font-medium hover:bg-[rgb(95,110,48)] transition-colors flex items-center gap-2"
                >
                  <span>✏️</span>
                  <span>Edit</span>
                </button>
              )}
              <ShareJournalButton
                journalId={journal._id}
                journalTitle={journal.title || 'Untitled'}
              />
              <button
                onClick={handleDelete}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <span>🗑️</span>
                <span>Delete</span>
              </button>
              <button
                onClick={() => router.push('/library')}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-300 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <span>📚</span>
                <span>Back to Library</span>
              </button>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
