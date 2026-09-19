'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { API_BASE_URL } from '@/lib/api';
import { Video as VideoExtension } from './videoExtension';
import { expandMediaUrls, isHtmlContent } from './htmlUtils';

type WriteupViewerProps = {
  content: string;
  className?: string;
};

function toViewerHtml(content: string): string {
  if (!content) return '';
  if (!isHtmlContent(content)) {
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return escaped
      .split(/\n/)
      .map((line) => `<p>${line || '<br>'}</p>`)
      .join('');
  }
  return expandMediaUrls(content, API_BASE_URL);
}

export default function WriteupViewer({ content, className = '' }: WriteupViewerProps) {
  // Legacy plain text: keep pre-wrap without TipTap overhead
  if (content && !isHtmlContent(content)) {
    return (
      <div className={`prose max-w-none ${className}`}>
        <div className="whitespace-pre-wrap text-gray-800 dark:text-stone-100 text-sm sm:text-base leading-relaxed">
          {content}
        </div>
      </div>
    );
  }

  return <TipTapReadonly content={content} className={className} />;
}

function TipTapReadonly({ content, className }: { content: string; className: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: { class: 'writeup-image' },
      }),
      VideoExtension,
    ],
    content: toViewerHtml(content),
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-stone dark:prose-invert max-w-none text-sm sm:text-base text-gray-800 dark:text-stone-100 leading-relaxed focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(toViewerHtml(content), { emitUpdate: false });
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className={className}>
      <EditorContent editor={editor} />
    </div>
  );
}
