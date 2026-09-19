export function isHtmlContent(content: string): boolean {
  if (!content) return false;
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

/** Strip HTML tags for character count, TTS, library previews, video gen. */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  if (typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.innerHTML = html;
    return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
  }
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

/** True when editor has meaningful text or media (not just empty tags). */
export function hasWriteupContent(html: string): boolean {
  if (!html) return false;
  if (/<(img|video)\b/i.test(html)) return true;
  return htmlToPlainText(html).length > 0;
}

/** Expand relative /uploads paths to absolute API URLs for display in the editor. */
export function expandMediaUrls(html: string, apiBase: string): string {
  if (!html) return html;
  const base = apiBase.replace(/\/$/, '');
  return html.replace(
    /(src=["'])(\/uploads\/[^"']+)(["'])/gi,
    (_m, a: string, path: string, b: string) => `${a}${base}${path}${b}`
  );
}

/** Collapse absolute API media URLs back to relative /uploads paths before save. */
export function collapseMediaUrls(html: string, apiBase: string): string {
  if (!html) return html;
  const base = apiBase.replace(/\/$/, '');
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(
    new RegExp(`(src=["'])${escaped}(\\/uploads\\/[^"']+)(["'])`, 'gi'),
    '$1$2$3'
  );
}
