'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getSharedWithMe,
  removeShared,
  toggleSharedStar,
  shareJournal,
  getFriends,
  type SharedJournalItem,
  type FriendListItem,
} from '@/lib/api';
import { Eye, Star, Share2, Trash2, FileText, Image, Music, Video } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

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

function getTypeIcon(type: string) {
  const t = (type || '').toLowerCase();
  if (t === 'text' || t === 'doc' || t === 'pdf' || t === 'document') return FileText;
  if (t === 'image') return Image;
  if (t === 'audio') return Music;
  if (t === 'video') return Video;
  return FileText;
}

export default function SharedPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [list, setList] = useState<SharedJournalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showReshareModal, setShowReshareModal] = useState(false);
  const [reshareItem, setReshareItem] = useState<SharedJournalItem | null>(null);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [reshareLoading, setReshareLoading] = useState(false);
  const [reshareError, setReshareError] = useState<string>('');

  const fetchList = useCallback(async () => {
    try {
      setError('');
      const response = await getSharedWithMe();
      if (response.data) {
        setList(response.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load shared journals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleView = (item: SharedJournalItem) => {
    router.push(`/shared/${item._id}`);
  };

  const handleStar = async (item: SharedJournalItem) => {
    try {
      setActingId(item._id);
      setError('');
      const response = await toggleSharedStar(item._id);
      if (response.data) {
        setList((prev) =>
          prev.map((s) => (s._id === item._id ? response.data! : s))
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle star');
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (item: SharedJournalItem) => {
    if (!confirm('Remove this shared item from your list? You can receive it again if someone shares it with you.')) {
      return;
    }
    try {
      setActingId(item._id);
      setError('');
      await removeShared(item._id);
      setList((prev) => prev.filter((s) => s._id !== item._id));
      setSuccessMessage('Share removed');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove share');
    } finally {
      setActingId(null);
    }
  };

  const openReshare = (item: SharedJournalItem) => {
    setReshareItem(item);
    setShowReshareModal(true);
    setReshareError('');
    getFriends()
      .then((r) => {
        if (r.data) setFriends(r.data);
      })
      .catch(() => setFriends([]));
  };

  const handleReshareToFriend = async (friendId: string) => {
    if (!reshareItem) return;
    try {
      setReshareLoading(true);
      setReshareError('');
      await shareJournal(reshareItem.journal._id, friendId);
      setSuccessMessage('Journal shared successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowReshareModal(false);
      setReshareItem(null);
      fetchList();
    } catch (err: unknown) {
      setReshareError(err instanceof Error ? err.message : 'Failed to share');
    } finally {
      setReshareLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-stone-100">
            {t('shared.title')}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-stone-300">
            {t('shared.subtitle')}
          </p>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
            {successMessage}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(112,130,56)] mb-4" />
              <p className="text-gray-600 dark:text-stone-300">Loading shared content...</p>
            </div>
          </div>
        )}

        {!loading && list.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700">
            <p className="text-6xl mb-4">📤</p>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-stone-100 mb-2">
              No shared content yet
            </h3>
            <p className="text-gray-600 dark:text-stone-300 text-center max-w-md">
              When someone shares a journal with you, it will appear here.
            </p>
          </div>
        )}

        {!loading && list.length > 0 && (
          <div className="space-y-4 mb-8">
            {list.map((item) => {
              const TypeIcon = getTypeIcon(item.journal.type);
              const isActing = actingId === item._id;
              return (
                <div
                  key={item._id}
                  className="bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm"
                >
                  <div className="flex flex-wrap gap-4 items-start">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[rgb(112,130,56)] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {getInitials(item.sharedBy.firstName, item.sharedBy.lastName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-stone-100">
                          Shared by {item.sharedBy.firstName} {item.sharedBy.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-stone-400">
                          {formatSharedDate(item.sharedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto sm:flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-800 dark:text-stone-100 truncate">
                        {item.journal.title || 'Untitled'}
                      </h3>
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                        <TypeIcon className="w-3.5 h-3.5" />
                        {getTypeLabel(item.journal.type)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => handleView(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 dark:bg-stone-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStar(item)}
                      disabled={isActing}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        item.starredByRecipient
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 dark:bg-stone-700'
                      }`}
                    >
                      <Star
                        className={`w-4 h-4 ${item.starredByRecipient ? 'fill-current' : ''}`}
                      />
                      {item.starredByRecipient ? 'Starred' : 'Star'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openReshare(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700 dark:bg-stone-700 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Reshare
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={isActing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-stone-800 text-red-700 dark:text-red-300 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reshare modal */}
      {showReshareModal && reshareItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-stone-900 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-stone-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-stone-100">Reshare with a friend</h3>
              <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">
                Share &quot;{reshareItem.journal.title || 'Untitled'}&quot; with:
              </p>
            </div>
            {reshareError && (
              <div className="mx-4 mt-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
                {reshareError}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {friends.length === 0 && !reshareLoading && (
                <p className="text-gray-500 dark:text-stone-400 text-sm">No friends to share with.</p>
              )}
              {friends.map((f) => (
                <button
                  key={f._id}
                  type="button"
                  onClick={() => handleReshareToFriend(f.friend._id)}
                  disabled={reshareLoading}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-stone-700 hover:bg-gray-50 dark:hover:bg-stone-800 text-left disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-full bg-[rgb(112,130,56)] flex items-center justify-center text-white text-sm font-medium">
                    {getInitials(f.friend.firstName, f.friend.lastName)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-stone-100">
                      {f.friend.firstName} {f.friend.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-stone-400">{f.friend.email}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => {
                  setShowReshareModal(false);
                  setReshareItem(null);
                  setReshareError('');
                }}
                className="w-full py-2 rounded-lg border border-gray-300 dark:border-stone-600 text-gray-700 dark:text-stone-300 font-medium hover:bg-gray-50 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
