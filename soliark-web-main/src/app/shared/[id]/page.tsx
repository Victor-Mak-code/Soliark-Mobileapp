'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getSharedItem,
  getFileUrl,
  updateJournal,
  type SharedJournalItem,
  type SharedJournalItemJournal,
} from '@/lib/api';
import WriteupEditor from '@/components/editor/WriteupEditor';
import WriteupViewer from '@/components/editor/WriteupViewer';

function formatSharedDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
}

function getTypeLabel(type: string): string {
  const t = (type || '').toLowerCase();
  if (t === 'text') return 'Text';
  if (t === 'doc' || t === 'pdf' || t === 'document') return 'Doc';
  if (t === 'image') return 'Image';
  if (t === 'audio') return 'Audio';
  if (t === 'video') return 'Video';
  return type || 'Text';
}

function SharedJournalContent({ journal }: { journal: SharedJournalItemJournal }) {
  const type = (journal.type || 'text').toLowerCase();

  return (
    <>
      {type === 'image' && journal.imageUrl && (
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

      {(type === 'doc' || type === 'pdf' || type === 'document') && journal.documentUrl && (
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
              If the document does not display above, click the button to open it in a new tab
            </p>
          </div>
        </div>
      )}

      {type === 'text' && <WriteupViewer content={journal.content} />}

      {type === 'audio' && journal.audioUrl && (
        <div className="mb-4">
          <audio controls className="w-full">
            <source src={getFileUrl(journal.audioUrl)} />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {type === 'video' && journal.videoUrl && (
        <div className="mb-4">
          <video controls className="w-full rounded-lg">
            <source src={getFileUrl(journal.videoUrl)} />
            Your browser does not support the video element.
          </video>
        </div>
      )}

      {type === 'text' && (
        <div className="mt-4 text-sm text-gray-500 dark:text-stone-400">
          {journal.characterCount} characters
        </div>
      )}
    </>
  );
}

export default function SharedJournalViewPage() {
  const params = useParams();
  const router = useRouter();
  const shareId = params.id as string;

  const [item, setItem] = useState<SharedJournalItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>('');

  const fetchItem = useCallback(() => {
    if (!shareId) return;
    getSharedItem(shareId)
      .then((res) => {
        if (res.data) {
          setItem(res.data);
          setEditedTitle(res.data.journal.title || '');
          setEditedContent(res.data.journal.content || '');
        } else setError('Shared item not found');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load shared journal');
      })
      .finally(() => setLoading(false));
  }, [shareId]);

  useEffect(() => {
    if (shareId) {
      setLoading(true);
      setError('');
      fetchItem();
    }
  }, [shareId, fetchItem]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 max-w-4xl">
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(112,130,56)] mb-4" />
              <p className="text-gray-600 dark:text-stone-300">Loading...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !item) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 max-w-4xl">
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-700 dark:text-red-300 mb-4">{error || 'Shared item not found'}</p>
            <button
              onClick={() => router.push('/shared')}
              className="px-4 py-2 bg-[rgb(112,130,56)] text-white rounded-lg hover:bg-[rgb(95,110,48)] transition-colors"
            >
              Back to Shared with Me
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const contributorRole = item.contributorRole ?? 'viewer';
  const isEditor = contributorRole === 'editor';
  const isTextType = (item.journal.type || 'text').toLowerCase() === 'text';

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await updateJournal(item.journal._id, {
        title: editedTitle.trim() || undefined,
        content: editedContent.trim(),
      });
      await fetchItem();
      setIsEditing(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(item.journal.title || '');
    setEditedContent(item.journal.content || '');
    setIsEditing(false);
    setSaveError('');
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-4xl">
        <button
          onClick={() => router.push('/shared')}
          className="mb-4 flex items-center gap-2 text-gray-600 dark:text-stone-300 hover:text-gray-800 dark:text-stone-100 transition-colors"
        >
          <span>←</span>
          <span className="text-sm sm:text-base">Back to Shared with Me</span>
        </button>

        <div className="bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[rgb(112,130,56)] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {getInitials(item.sharedBy.firstName, item.sharedBy.lastName)}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-stone-100">
                Shared by {item.sharedBy.firstName} {item.sharedBy.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-stone-400">
                {item.journal.title || 'Untitled'} • {formatSharedDate(item.sharedAt)}
              </p>
            </div>
          </div>

          {isEditing ? (
            <>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Title"
                className="w-full text-xl sm:text-2xl font-bold text-gray-800 dark:text-stone-100 border-b-2 border-[rgb(112,130,56)] focus:outline-none pb-2 mb-2"
              />
              {isTextType && (
                <WriteupEditor
                  value={editedContent}
                  onChange={setEditedContent}
                  placeholder="Content"
                  minHeightClass="min-h-[16rem]"
                />
              )}
              {saveError && (
                <p className="text-sm text-red-600 mb-2">{saveError}</p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-[rgb(112,130,56)] text-white rounded-lg font-medium hover:bg-[rgb(95,110,48)] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-300 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-stone-100">
                  {item.journal.title || 'Untitled'}
                </h1>
                {isEditor && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-sm font-medium bg-[rgb(112,130,56)]/20 text-[rgb(112,130,56)] rounded-lg hover:bg-[rgb(112,130,56)]/30"
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="mb-4">
                <span className="px-2 py-1 rounded text-xs font-medium bg-sky-100 text-sky-800">
                  {getTypeLabel(item.journal.type)}
                </span>
              </div>

              <SharedJournalContent journal={item.journal} />
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
