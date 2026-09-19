'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Image as ImageIcon, Video, List, ListOrdered } from 'lucide-react';
import { API_BASE_URL, uploadAsset } from '@/lib/api';
import { Video as VideoExtension } from './videoExtension';
import {
  collapseMediaUrls,
  expandMediaUrls,
  isHtmlContent,
} from './htmlUtils';

type WriteupEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeightClass?: string;
};

function toEditorHtml(value: string): string {
  if (!value) return '';
  if (!isHtmlContent(value)) {
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return escaped
      .split(/\n/)
      .map((line) => `<p>${line || '<br>'}</p>`)
      .join('');
  }
  return expandMediaUrls(value, API_BASE_URL);
}

export default function WriteupEditor({
  value,
  onChange,
  placeholder = 'Start writing your journal entry here...',
  className = '',
  minHeightClass = 'min-h-[16rem] sm:min-h-[20rem]',
}: WriteupEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef<string>('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: 'writeup-image',
        },
      }),
      VideoExtension,
      Placeholder.configure({ placeholder }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        class: `prose prose-stone dark:prose-invert max-w-none px-4 py-3 focus:outline-none ${minHeightClass} text-sm sm:text-base text-gray-900 dark:text-stone-100`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = collapseMediaUrls(ed.getHTML(), API_BASE_URL);
      lastEmitted.current = html;
      onChange(html);
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    const collapsed = collapseMediaUrls(value || '', API_BASE_URL);
    if (collapsed === lastEmitted.current) return;
    // External value change (e.g. load journal) — reset content
    const next = toEditorHtml(value);
    editor.commands.setContent(next, { emitUpdate: false });
    lastEmitted.current = collapsed;
  }, [value, editor]);

  const handleAssetUpload = useCallback(
    async (file: File, kind: 'image' | 'video') => {
      if (!editor) return;
      setUploadError('');
      setUploading(true);
      try {
        const result = await uploadAsset(file, kind);
        const fileUrl = result.data?.fileUrl;
        if (!fileUrl) throw new Error('Upload did not return a file URL');
        const displaySrc = fileUrl.startsWith('http')
          ? fileUrl
          : `${API_BASE_URL}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
        if (kind === 'image') {
          editor.chain().focus().setImage({ src: displaySrc }).run();
        } else {
          editor.chain().focus().setVideo({ src: displaySrc }).run();
        }
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [editor]
  );

  if (!editor) {
    return (
      <div
        className={`rounded-lg border border-gray-300 dark:border-stone-600 bg-white dark:bg-stone-900 ${minHeightClass} ${className}`}
      />
    );
  }

  const toolbarBtn =
    'inline-flex items-center justify-center rounded-md p-2 text-stone-700 dark:text-stone-200 hover:bg-stone-200/70 dark:hover:bg-stone-700 disabled:opacity-40';

  return (
    <div
      className={`rounded-lg border border-gray-300 dark:border-stone-600 bg-white dark:bg-stone-900 overflow-hidden ${className}`}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 dark:border-stone-700 bg-[#f3ead9]/60 dark:bg-stone-800/80 px-2 py-1.5">
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
          data-active={editor.isActive('bold') || undefined}
          style={editor.isActive('bold') ? { backgroundColor: 'rgba(0,0,0,0.08)' } : undefined}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
          style={editor.isActive('italic') ? { backgroundColor: 'rgba(0,0,0,0.08)' } : undefined}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
          style={
            editor.isActive('bulletList') ? { backgroundColor: 'rgba(0,0,0,0.08)' } : undefined
          }
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Ordered list"
          style={
            editor.isActive('orderedList') ? { backgroundColor: 'rgba(0,0,0,0.08)' } : undefined
          }
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-stone-300 dark:bg-stone-600" />
        <button
          type="button"
          className={toolbarBtn}
          disabled={uploading}
          onClick={() => imageInputRef.current?.click()}
          aria-label="Insert image"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          disabled={uploading}
          onClick={() => videoInputRef.current?.click()}
          aria-label="Insert video"
        >
          <Video className="h-4 w-4" />
        </button>
        {uploading && (
          <span className="ml-2 text-xs text-stone-500 dark:text-stone-400">Uploading…</span>
        )}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void handleAssetUpload(file, 'image');
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void handleAssetUpload(file, 'video');
          }}
        />
      </div>
      <EditorContent editor={editor} />
      {uploadError && (
        <p className="border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {uploadError}
        </p>
      )}
    </div>
  );
}
