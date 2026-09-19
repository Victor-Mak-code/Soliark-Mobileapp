'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getFriends,
  shareJournal,
  type FriendListItem,
  type ContributorRole,
} from '@/lib/api';
import { useToast } from '@/components/ToastContext';
import { Search, X, Eye, Pencil } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
}

export interface ShareJournalModalProps {
  open: boolean;
  journalId: string | null;
  journalTitle?: string;
  onClose: () => void;
}

export default function ShareJournalModal({
  open,
  journalId,
  journalTitle = 'Untitled',
  onClose,
}: ShareJournalModalProps) {
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [contributorRole, setContributorRole] = useState<ContributorRole>('viewer');
  const [loading, setLoading] = useState(false);
  const [sharingToId, setSharingToId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setError('');
      setContributorRole('viewer');
      setSharingToId(null);
      setLoading(true);
      getFriends()
        .then((res) => {
          if (res.data) setFriends(res.data);
        })
        .catch(() => setFriends([]))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter(
      (f) =>
        f.friend.firstName.toLowerCase().includes(q) ||
        f.friend.lastName.toLowerCase().includes(q) ||
        f.friend.email.toLowerCase().includes(q)
    );
  }, [friends, searchQuery]);

  const handleShare = async (friendId: string) => {
    if (!journalId) return;
    setSharingToId(friendId);
    setError('');
    try {
      await shareJournal(journalId, friendId, contributorRole);
      const friend = friends.find((f) => f.friend._id === friendId);
      const name = friend
        ? `${friend.friend.firstName} ${friend.friend.lastName}`
        : 'Friend';
      toast(`Journal shared with ${name}`, 'success');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to share journal';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setSharingToId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-stone-900 rounded-lg shadow-xl max-w-md w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-stone-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-stone-100">{t('share.title')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-stone-800 text-gray-600 dark:text-stone-300"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="px-4 pt-2 text-sm text-gray-500 dark:text-stone-400 truncate">
          {t('share.withFriend', { title: journalTitle })}
        </p>
        <div className="px-4 pt-2 pb-3 border-b border-gray-100 dark:border-stone-800">
          <p className="text-xs font-medium text-gray-600 dark:text-stone-300 mb-2">{t('share.role')}</p>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="contributorRole"
                value="viewer"
                checked={contributorRole === 'viewer'}
                onChange={() => setContributorRole('viewer')}
                className="text-[rgb(112,130,56)] focus:ring-[rgb(112,130,56)]"
              />
              <Eye className="w-4 h-4 text-gray-500 dark:text-stone-400" />
              <span className="text-sm text-gray-700 dark:text-stone-300">{t('share.viewer')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="contributorRole"
                value="editor"
                checked={contributorRole === 'editor'}
                onChange={() => setContributorRole('editor')}
                className="text-[rgb(112,130,56)] focus:ring-[rgb(112,130,56)]"
              />
              <Pencil className="w-4 h-4 text-gray-500 dark:text-stone-400" />
              <span className="text-sm text-gray-700 dark:text-stone-300">{t('share.editor')}</span>
            </label>
          </div>
        </div>
        <div className="p-4 border-b border-gray-100 dark:border-stone-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-stone-400" />
            <input
              type="text"
              placeholder={t('share.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] focus:border-transparent text-sm text-gray-900 dark:text-stone-100 placeholder-gray-500 bg-white dark:bg-stone-900"
            />
          </div>
        </div>
        {error && (
          <div className="mx-4 mt-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {loading && (
            <p className="text-sm text-gray-500 dark:text-stone-400 text-center py-4">{t('share.loadingFriends')}</p>
          )}
          {!loading && filteredFriends.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-stone-400 text-center py-4">
              {friends.length === 0
                ? t('share.noFriends')
                : t('share.noMatch')}
            </p>
          )}
          {filteredFriends.map((f) => (
            <button
              key={f._id}
              type="button"
              onClick={() => handleShare(f.friend._id)}
              disabled={!!sharingToId}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-stone-700 hover:bg-gray-50 dark:hover:bg-stone-800 text-left disabled:opacity-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[rgb(112,130,56)] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {getInitials(f.friend.firstName, f.friend.lastName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-stone-100 truncate">
                  {f.friend.firstName} {f.friend.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-stone-400 truncate">{f.friend.email}</p>
              </div>
              {sharingToId === f.friend._id && (
                <span className="text-xs text-gray-500 dark:text-stone-400">{t('share.sharing')}</span>
              )}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-stone-700">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-lg border border-gray-300 dark:border-stone-600 text-gray-700 dark:text-stone-300 font-medium hover:bg-gray-50 dark:hover:bg-stone-800"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
