'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import ShareJournalButton from '@/components/ShareJournalButton';
import {
  getJournal,
  getCollaborators,
  getComments,
  createComment,
  updateJournal,
  getFileUrl,
  getCurrentUser,
  type Journal,
  type CollaboratorItem,
  type CommentItem,
} from '@/lib/api';
import { Eye, Pencil } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import WriteupEditor from '@/components/editor/WriteupEditor';
import WriteupViewer from '@/components/editor/WriteupViewer';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

function JournalContent({ journal }: { journal: Journal }) {
  const type = (journal.type || 'text').toLowerCase();

  return (
    <>
      {type === 'image' && journal.imageUrl && (
        <div className="mb-4">
          <img
            src={getFileUrl(journal.imageUrl)}
            alt={journal.title || 'Uploaded image'}
            className="max-w-full h-auto rounded-lg shadow-md"
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

export default function CollaborationJournalPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const journalId = params.journalId as string;

  const [journal, setJournal] = useState<Journal | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [previewMode, setPreviewMode] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const myRole = currentUserId
    ? collaborators.find((c) => c.userId === currentUserId)?.role
    : null;
  const canEdit = myRole === 'Owner' || myRole === 'Editor';
  const isTextType = (journal?.type || 'text').toLowerCase() === 'text';

  const fetchData = useCallback(async () => {
    if (!journalId) return;
    try {
      setError('');
      const [journalRes, collabRes, commentsRes, user] = await Promise.all([
        getJournal(journalId),
        getCollaborators(journalId),
        getComments(journalId),
        getCurrentUser(),
      ]);
      if (journalRes.data) {
        const j = journalRes.data as Journal;
        setJournal(j);
        setEditedTitle(j.title || '');
        setEditedContent(j.content || '');
      } else {
        setError('Journal not found');
      }
      if (collabRes.data) setCollaborators(collabRes.data);
      if (commentsRes.data) setComments(commentsRes.data);
      if (user) setCurrentUserId(user.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [journalId]);

  useEffect(() => {
    if (journalId) {
      setLoading(true);
      fetchData();
    }
  }, [journalId, fetchData]);

  const handleSave = async () => {
    if (!journal) return;
    setSaving(true);
    setSaveError('');
    try {
      await updateJournal(journal._id, {
        title: editedTitle.trim() || undefined,
        content: editedContent.trim(),
      });
      const res = await getJournal(journalId);
      if (res.data) setJournal(res.data as Journal);
      setIsEditing(false);
      setPreviewMode(true);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (journal) {
      setEditedTitle(journal.title || '');
      setEditedContent(journal.content || '');
    }
    setIsEditing(false);
    setSaveError('');
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await createComment(journalId, commentText.trim());
      if (res.data) setComments((prev) => [...prev, res.data!]);
      setCommentText('');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 flex justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(112,130,56)] mb-4" />
            <p className="text-gray-600 dark:text-stone-300">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !journal) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 max-w-4xl">
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-700 dark:text-red-300 mb-4">{error || 'Journal not found'}</p>
            <button
              onClick={() => router.push('/collaboration')}
              className="px-4 py-2 bg-[rgb(112,130,56)] text-white rounded-lg hover:bg-[rgb(95,110,48)] transition-colors"
            >
              {t('collaboration.back')}
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-6 max-w-6xl">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => router.push('/collaboration')}
            className="mb-4 flex items-center gap-2 text-gray-600 dark:text-stone-300 hover:text-gray-800 dark:text-stone-100 transition-colors"
          >
            <span>←</span>
            <span className="text-sm sm:text-base">{t('collaboration.back')}</span>
          </button>

          <div className="bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-stone-100">
                {isEditing ? editedTitle || 'Untitled' : journal.title || 'Untitled'}
              </h1>
              <p className="text-xs text-gray-500 dark:text-stone-400">
                Last modified {formatRelativeTime(journal.updatedAt)}
              </p>
            </div>

            {!isEditing && canEdit && (
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => { setPreviewMode(true); setIsEditing(false); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${previewMode ? 'bg-gray-200 dark:bg-stone-700 text-gray-800 dark:text-stone-100' : 'bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 dark:bg-stone-700'}`}
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => { setPreviewMode(false); setIsEditing(true); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${!previewMode ? 'bg-[rgb(112,130,56)] text-white' : 'bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 dark:bg-stone-700'}`}
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              </div>
            )}

            {isEditing ? (
              <>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full text-xl font-bold text-gray-800 dark:text-stone-100 border-b-2 border-[rgb(112,130,56)] focus:outline-none pb-2 mb-2"
                />
                {isTextType && (
                  <WriteupEditor
                    value={editedContent}
                    onChange={setEditedContent}
                    placeholder="Content"
                    minHeightClass="min-h-[16rem]"
                  />
                )}
                {saveError && <p className="text-sm text-red-600 mb-2">{saveError}</p>}
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
                <div className="mb-4">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-sky-100 text-sky-800">
                    {getTypeLabel(journal.type)}
                  </span>
                </div>
                <JournalContent journal={journal} />
              </>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-stone-700 text-sm text-gray-500 dark:text-stone-400">
              {comments.length} comment{comments.length !== 1 ? 's' : ''}, {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}, Last edit {formatRelativeTime(journal.updatedAt)}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 dark:bg-stone-700"
              >
                Create Storyboard
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 dark:bg-stone-700"
              >
                Export Draft
              </button>
              <ShareJournalButton
                journalId={journal._id}
                journalTitle={journal.title || 'Untitled'}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-[rgb(112,130,56)] text-white hover:bg-[rgb(95,110,48)] flex items-center gap-1.5"
              >
                Share with Others
              </ShareJournalButton>
            </div>
          </div>
        </div>

        <aside className="w-full lg:w-80 flex-shrink-0 space-y-4">
          <div className="bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-stone-100 mb-3">{t('collaboration.collaborators')}</h3>
            <ul className="space-y-2">
              {collaborators.map((c) => (
                <li key={c._id} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[rgb(112,130,56)] flex items-center justify-center text-white text-xs font-medium">
                    {getInitials(c.firstName, c.lastName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-stone-100 truncate">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-stone-400">{c.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-stone-100 mb-3">{t('collaboration.comments')}</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {comments.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-stone-400">{t('collaboration.noComments')}</p>
              )}
              {comments.map((c) => (
                <div key={c._id} className="text-sm">
                  <p className="font-medium text-gray-800 dark:text-stone-100">
                    {c.author.firstName} {c.author.lastName}{' '}
                    <span className="text-gray-500 dark:text-stone-400 font-normal">
                      {formatRelativeTime(c.createdAt)}:
                    </span>
                  </p>
                  <p className="text-gray-700 dark:text-stone-300 mt-0.5">{c.content}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} className="mt-3">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-stone-600 rounded-lg text-sm text-gray-900 dark:text-stone-100 placeholder-gray-500 bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)]"
                disabled={submittingComment}
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="mt-2 px-3 py-1.5 text-sm font-medium bg-[rgb(112,130,56)] text-white rounded-lg hover:bg-[rgb(95,110,48)] disabled:opacity-50"
              >
                {submittingComment ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
}
