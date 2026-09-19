export function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasWriteupContent(html: string): boolean {
  if (!html) return false;
  if (/<(img|video)\b/i.test(html)) return true;
  return htmlToPlainText(html).length > 0;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
  return formatDate(dateString);
}

export function getInitials(firstName?: string, lastName?: string): string {
  return `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`.toUpperCase() || '?';
}

export function mapJournalType(type: string): 'Text' | 'Audio' | 'Video' | 'Image' | 'Doc' {
  switch (type) {
    case 'audio':
      return 'Audio';
    case 'video':
      return 'Video';
    case 'image':
      return 'Image';
    case 'doc':
    case 'document':
    case 'pdf':
      return 'Doc';
    default:
      return 'Text';
  }
}

export function canCreateVideoFromJournal(type: string): boolean {
  return ['text', 'doc', 'document', 'pdf'].includes(type);
}
