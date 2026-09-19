import { getFileUrl, type Journal } from '@/lib/api';

export type SocialPlatformId = 'youtube' | 'instagram' | 'tiktok';

export const PLATFORM_UPLOAD_URLS: Record<SocialPlatformId, string> = {
  youtube: 'https://www.youtube.com/upload',
  instagram: 'https://www.instagram.com/',
  tiktok: 'https://www.tiktok.com/tiktokstudio/upload',
};

export function isDocJournal(journal: Journal): boolean {
  return journal.type === 'text' || journal.type === 'doc' || journal.type === 'document' || journal.type === 'pdf';
}

export function isShareableJournal(journal: Journal): boolean {
  return journal.type === 'image' || journal.type === 'video';
}

export function platformAllowsJournal(platform: SocialPlatformId, journal: Journal): boolean {
  if (platform === 'instagram') return journal.type === 'image' || journal.type === 'video';
  return journal.type === 'video';
}

export function getJournalFilePath(journal: Journal): string | null {
  if (journal.type === 'image') return journal.imageUrl || journal.fileUrl || null;
  if (journal.type === 'video') return journal.videoUrl || journal.fileUrl || null;
  if (isDocJournal(journal)) return journal.documentUrl || journal.fileUrl || null;
  return null;
}

export function getJournalFileUrl(journal: Journal): string | null {
  const path = getJournalFilePath(journal);
  return path ? getFileUrl(path) : null;
}

export function filenameFromUrl(fileUrl: string, fallback: string): string {
  try {
    const pathname = new URL(fileUrl, window.location.origin).pathname;
    const last = pathname.split('/').filter(Boolean).pop();
    if (last) return decodeURIComponent(last);
  } catch {
    const last = fileUrl.split('/').pop()?.split('?')[0];
    if (last) return last;
  }
  return fallback;
}

function mimeFromFilename(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'webm':
      return 'video/webm';
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

export function safeFilename(title: string, extension: string): string {
  const base = title.replace(/[<>:"/\\|?*]+/g, ' ').trim() || 'export';
  return `${base}.${extension}`;
}

export function textJournalFile(journal: Journal): File {
  const name = safeFilename(journal.title || 'journal', 'txt');
  return new File([journal.content || ''], name, { type: 'text/plain' });
}

export async function fetchAsFile(fileUrl: string, filename: string): Promise<File> {
  const response = await fetch(fileUrl, { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Failed to fetch file');
  }
  const blob = await response.blob();
  const type = blob.type && blob.type !== 'application/octet-stream' ? blob.type : mimeFromFilename(filename);
  return new File([blob], filename, { type });
}

export function triggerDownload(file: File): void {
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function getJournalAsFile(journal: Journal): Promise<File> {
  const fileUrl = getJournalFileUrl(journal);
  if (fileUrl) {
    const filename = filenameFromUrl(fileUrl, safeFilename(journal.title || 'export', journal.type === 'video' ? 'mp4' : 'bin'));
    try {
      return await fetchAsFile(fileUrl, filename);
    } catch {
      throw new Error('FILE_FETCH_FAILED');
    }
  }
  if (journal.type === 'text') {
    return textJournalFile(journal);
  }
  throw new Error('This item has no file to download.');
}

export function downloadViaAnchor(fileUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = filename;
  link.rel = 'noopener';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function shareNatively(file: File, title: string): Promise<boolean> {
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };
  const data: ShareData = { files: [file], title, text: title };
  if (typeof nav.canShare !== 'function' || !nav.canShare(data) || typeof nav.share !== 'function') {
    return false;
  }
  await nav.share(data);
  return true;
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

export async function shareToPlatform(
  platform: SocialPlatformId,
  journal: Journal
): Promise<ShareOutcome> {
  const fileUrl = getJournalFileUrl(journal);
  const title = journal.title || 'Soliark export';

  let file: File | null = null;
  try {
    file = await getJournalAsFile(journal);
  } catch {
    file = null;
  }

  if (file) {
    try {
      const shared = await shareNatively(file, title);
      if (shared) return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
    }
    triggerDownload(file);
  } else if (fileUrl) {
    downloadViaAnchor(fileUrl, filenameFromUrl(fileUrl, title));
  } else {
    throw new Error('This journal has no file to share.');
  }

  window.open(PLATFORM_UPLOAD_URLS[platform], '_blank', 'noopener,noreferrer');
  return 'downloaded';
}
