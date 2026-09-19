'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { extractTextFromPDF, isPDFUrl } from '@/lib/pdfExtractor';
import {
  generateJournalVideo,
  getFileUrl,
  getVideoGenerationById,
  type Journal,
  type JournalVideoOptions,
  type VideoGenerationJob,
} from '@/lib/api';
import { useToast } from '@/components/ToastContext';

const GENERATABLE_TYPES = new Set(['text', 'doc', 'document', 'pdf']);
const STORAGE_KEY = 'journal-video-jobs';
const POLL_MS = 4000;

export function canCreateVideoFromJournal(journal: Pick<Journal, 'type'>): boolean {
  return GENERATABLE_TYPES.has(journal.type);
}

export function isActiveVideoJob(status?: string): boolean {
  return status === 'queued' || status === 'processing' || status === 'saving';
}

export function videoJobStatusLabel(status?: string): string {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'processing':
      return 'Generating...';
    case 'saving':
      return 'Saving...';
    default:
      return 'Generating...';
  }
}

function isPlaceholderDocumentContent(content: string): boolean {
  return /^document file:/i.test(content.trim());
}

function readStoredJobs(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    );
  } catch {
    return {};
  }
}

function writeStoredJobs(jobs: Record<string, string>) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export function getStoredJournalVideoJobId(journalId: string): string | undefined {
  return readStoredJobs()[journalId];
}

export function saveJournalVideoJob(journalId: string, jobId: string) {
  const jobs = readStoredJobs();
  jobs[journalId] = jobId;
  writeStoredJobs(jobs);
}

export function clearJournalVideoJob(journalId: string) {
  const jobs = readStoredJobs();
  if (!(journalId in jobs)) return;
  delete jobs[journalId];
  writeStoredJobs(jobs);
}

export async function resolveJournalSourceText(journal: Journal): Promise<string | undefined> {
  if (journal.type === 'text') return undefined;

  const stored = journal.content?.trim() || '';
  if (stored && !isPlaceholderDocumentContent(stored)) {
    return stored;
  }

  const path = journal.documentUrl || journal.fileUrl;
  if (!path) {
    throw new Error('This document has no file to read.');
  }

  const url = getFileUrl(path);
  const looksPdf = isPDFUrl(url) || path.toLowerCase().includes('.pdf');
  if (!looksPdf) {
    throw new Error(
      'Create Video from documents currently supports PDFs. Convert to PDF or paste as a write-up.'
    );
  }

  const text = await extractTextFromPDF(url);
  if (!text.trim()) {
    throw new Error('Could not read text from this PDF.');
  }
  return text;
}

export async function startJournalVideo(
  journal: Journal,
  options?: JournalVideoOptions
): Promise<VideoGenerationJob> {
  const sourceText = await resolveJournalSourceText(journal);
  const response = await generateJournalVideo(journal._id, sourceText, options);
  if (!response.data) {
    throw new Error('Failed to start video generation');
  }
  if (isActiveVideoJob(response.data.status)) {
    saveJournalVideoJob(journal._id, response.data.id);
  }
  return response.data;
}

export async function fetchJournalVideoJob(
  jobId: string
): Promise<VideoGenerationJob | null> {
  const response = await getVideoGenerationById(jobId);
  return response.data ?? null;
}

export function useJournalVideoJobs(options?: {
  onCompleted?: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [statusById, setStatusById] = useState<Record<string, string>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const pollInFlightRefs = useRef<Record<string, boolean>>({});
  const jobIdByJournalRef = useRef<Record<string, string>>({});
  const onCompletedRef = useRef(options?.onCompleted);
  onCompletedRef.current = options?.onCompleted;

  const markGenerating = useCallback((journalId: string, generating: boolean) => {
    setGeneratingIds((prev) => {
      const next = new Set(prev);
      if (generating) next.add(journalId);
      else next.delete(journalId);
      return next;
    });
  }, []);

  const setStatus = useCallback((journalId: string, status?: string) => {
    setStatusById((prev) => {
      if (!status) {
        if (!(journalId in prev)) return prev;
        const next = { ...prev };
        delete next[journalId];
        return next;
      }
      if (prev[journalId] === status) return prev;
      return { ...prev, [journalId]: status };
    });
  }, []);

  const setCardError = useCallback((journalId: string, message?: string) => {
    setErrorById((prev) => {
      if (!message) {
        if (!(journalId in prev)) return prev;
        const next = { ...prev };
        delete next[journalId];
        return next;
      }
      return { ...prev, [journalId]: message };
    });
  }, []);

  const stopPolling = useCallback((journalId: string) => {
    const interval = pollRefs.current[journalId];
    if (interval) {
      clearInterval(interval);
      delete pollRefs.current[journalId];
    }
  }, []);

  const finishJob = useCallback(
    async (journalId: string, job: VideoGenerationJob) => {
      stopPolling(journalId);
      markGenerating(journalId, false);
      clearJournalVideoJob(journalId);
      delete jobIdByJournalRef.current[journalId];
      setStatus(journalId, undefined);

      if (job.status === 'completed') {
        setCardError(journalId, undefined);
        toast('Video created. It is now in My Library.', 'success');
        await onCompletedRef.current?.();
      } else if (job.status === 'failed') {
        const message = job.error || 'Video generation failed';
        setCardError(journalId, message);
        toast(message, 'error');
      }
    },
    [markGenerating, setCardError, setStatus, stopPolling, toast]
  );

  const startPolling = useCallback(
    (journalId: string, jobId: string) => {
      jobIdByJournalRef.current[journalId] = jobId;
      saveJournalVideoJob(journalId, jobId);
      if (pollRefs.current[journalId]) return;

      const tick = async () => {
        if (pollInFlightRefs.current[journalId]) return;
        pollInFlightRefs.current[journalId] = true;
        try {
          const job = await fetchJournalVideoJob(jobId);
          if (!job) return;
          if (isActiveVideoJob(job.status)) {
            setStatus(journalId, videoJobStatusLabel(job.status));
            return;
          }
          await finishJob(journalId, job);
        } catch {
          // Keep Generating and retry; a single failed GET must not drop a paid job.
        } finally {
          pollInFlightRefs.current[journalId] = false;
        }
      };

      void tick();
      pollRefs.current[journalId] = setInterval(tick, POLL_MS);
    },
    [finishJob, setStatus]
  );

  const restoreStoredJobs = useCallback(async () => {
    const stored = readStoredJobs();
    await Promise.all(
      Object.entries(stored).map(async ([journalId, jobId]) => {
        markGenerating(journalId, true);
        setStatus(journalId, 'Generating...');
        try {
          const job = await fetchJournalVideoJob(jobId);
          if (!job) {
            startPolling(journalId, jobId);
            return;
          }
          if (isActiveVideoJob(job.status)) {
            setStatus(journalId, videoJobStatusLabel(job.status));
            startPolling(journalId, jobId);
            return;
          }
          await finishJob(journalId, job);
        } catch {
          startPolling(journalId, jobId);
        }
      })
    );
  }, [finishJob, markGenerating, setStatus, startPolling]);

  // Restore once per mount; polling is held in refs.
  useEffect(() => {
    void restoreStoredJobs();
    return () => {
      Object.values(pollRefs.current).forEach((id) => clearInterval(id));
      pollRefs.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once; poll timers live in refs
  }, []);

  const startForJournal = useCallback(
    async (journal: Journal) => {
      if (!canCreateVideoFromJournal(journal) || generatingIds.has(journal._id)) return;

      setCardError(journal._id, undefined);
      markGenerating(journal._id, true);
      setStatus(journal._id, 'Starting...');

      try {
        const job = await startJournalVideo(journal);
        toast('Video generation started. This may take a few minutes.', 'success');
        if (isActiveVideoJob(job.status)) {
          setStatus(journal._id, videoJobStatusLabel(job.status));
          startPolling(journal._id, job.id);
        } else {
          await finishJob(journal._id, job);
        }
      } catch (err: unknown) {
        markGenerating(journal._id, false);
        setStatus(journal._id, undefined);
        const message =
          err instanceof Error ? err.message : 'Failed to start video generation';
        setCardError(journal._id, message);
        toast(message, 'error');
      }
    },
    [finishJob, generatingIds, markGenerating, setCardError, setStatus, startPolling, toast]
  );

  const cardStatus = useCallback(
    (journalId: string): string | undefined => {
      if (errorById[journalId]) return errorById[journalId];
      if (generatingIds.has(journalId)) {
        return statusById[journalId] || 'Generating...';
      }
      return undefined;
    },
    [errorById, generatingIds, statusById]
  );

  return {
    generatingIds,
    startForJournal,
    cardStatus,
  };
}
