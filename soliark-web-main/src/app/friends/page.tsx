'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/components/ToastContext';
import {
  getFriends,
  getPendingInvitations,
  inviteFriend,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  blockFriend,
  type FriendListItem,
  type PendingInvitationItem,
} from '@/lib/api';
import { Search, UserPlus, MessageCircle, Share2, Ban, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

type TabType = 'friends' | 'pending' | 'shared';

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [pending, setPending] = useState<PendingInvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actingPendingId, setActingPendingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    if (activeTab === 'friends') {
      fetchFriends();
    } else if (activeTab === 'pending') {
      fetchPending();
    }
  }, [activeTab]);

  const fetchPending = async () => {
    try {
      setPendingLoading(true);
      setError('');
      const response = await getPendingInvitations();
      if (response.data) setPending(response.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load pending invitations');
    } finally {
      setPendingLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getFriends();
      if (response.data) {
        setFriends(response.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter(
      (item) =>
        item.friend.firstName.toLowerCase().includes(q) ||
        item.friend.lastName.toLowerCase().includes(q) ||
        item.friend.email.toLowerCase().includes(q)
    );
  }, [friends, searchQuery]);

  const formatJoinedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || '?';
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSubmitting(true);
    setInviteMessage(null);
    try {
      await inviteFriend(inviteEmail);
      toast(`Friend request sent to ${inviteEmail.trim()}`, 'success');
      setInviteMessage({ type: 'success', text: 'Friend request sent successfully.' });
      setInviteEmail('');
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteMessage(null);
        fetchFriends();
      }, 1500);
    } catch (err: unknown) {
      setInviteMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send invite',
      });
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this friend? They will need to send a new request to connect again.')) return;
    try {
      await removeFriend(id);
      await fetchFriends();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove friend');
    }
  };

  const handleBlock = async (id: string) => {
    if (!confirm('Block this friend? You can unblock later from settings.')) return;
    try {
      await blockFriend(id);
      await fetchFriends();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to block friend');
    }
  };

  const handleAcceptPending = async (friendshipId: string) => {
    try {
      setActingPendingId(friendshipId);
      setError('');
      await acceptFriendRequest(friendshipId);
      await fetchPending();
      await fetchFriends();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to accept request');
    } finally {
      setActingPendingId(null);
    }
  };

  const handleRejectPending = async (friendshipId: string) => {
    if (!confirm('Reject this friend request?')) return;
    try {
      setActingPendingId(friendshipId);
      setError('');
      await rejectFriendRequest(friendshipId);
      await fetchPending();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setActingPendingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-stone-100 mb-2">{t('friends.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-stone-300">
            {t('friends.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
              activeTab === 'friends'
                ? 'bg-[rgb(139,69,19)]/30 text-[rgb(139,69,19)]'
                : 'bg-white dark:bg-stone-900 text-gray-700 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 border border-gray-200 dark:border-stone-700'
            }`}
          >
            {t('friends.tabFriends')} ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-[rgb(139,69,19)]/30 text-[rgb(139,69,19)]'
                : 'bg-white dark:bg-stone-900 text-gray-700 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 border border-gray-200 dark:border-stone-700'
            }`}
          >
            {t('friends.pending')} ({pending.length})
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
              activeTab === 'shared'
                ? 'bg-[rgb(139,69,19)]/30 text-[rgb(139,69,19)]'
                : 'bg-white dark:bg-stone-900 text-gray-700 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 border border-gray-200 dark:border-stone-700'
            }`}
          >
            {t('nav.shared')}
          </button>
        </div>

        {activeTab === 'friends' && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-stone-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] focus:border-transparent text-sm sm:text-base text-gray-900 dark:text-stone-100 placeholder-gray-500 bg-white dark:bg-stone-900"
                />
              </div>
              <button
                onClick={() => {
                  setShowInviteModal(true);
                  setInviteEmail('');
                  setInviteMessage(null);
                }}
                className="px-4 sm:px-6 py-2.5 bg-[rgb(230,168,77)] text-white rounded-lg font-medium hover:bg-[rgb(220,158,67)] transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                <span>{t('friends.invite')}</span>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(112,130,56)] mb-4" />
                  <p className="text-gray-600 dark:text-stone-300">Loading friends...</p>
                </div>
              </div>
            )}

            {!loading && activeTab === 'friends' && filteredFriends.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700">
                <p className="text-6xl mb-4">👥</p>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-stone-100 mb-2">{t('friends.empty')}</h3>
                <p className="text-gray-600 dark:text-stone-300 text-center mb-6 max-w-md">
                  {searchQuery
                    ? 'No friends match your search. Try a different term.'
                    : 'Invite friends by email to start connecting.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-6 py-3 bg-[rgb(112,130,56)] text-white rounded-lg font-medium hover:bg-[rgb(95,110,48)] transition-colors flex items-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    {t('friends.invite')}
                  </button>
                )}
              </div>
            )}

            {!loading && activeTab === 'friends' && filteredFriends.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-stone-100">{t('friends.yourFriends')}</h2>
                {filteredFriends.map((item) => (
                  <div
                    key={item._id}
                    className="bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[rgb(112,130,56)] flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                        {getInitials(item.friend.firstName, item.friend.lastName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800 dark:text-stone-100 truncate">
                          {item.friend.firstName} {item.friend.lastName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-stone-400 truncate">{item.friend.email}</p>
                        <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
                          {item.sharedItemsCount} shared items • Joined {formatJoinedDate(item.joinedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => console.log('Message', item.friend._id)}
                        className="p-2 rounded-full text-gray-500 dark:text-stone-400 hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors"
                        aria-label="Message"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => console.log('Share', item.friend._id)}
                        className="p-2 rounded-full text-gray-500 dark:text-stone-400 hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors"
                        aria-label="Share"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleBlock(item._id)}
                        className="p-2 rounded-full text-gray-500 dark:text-stone-400 hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors"
                        aria-label="Block"
                      >
                        <Ban className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleRemove(item._id)}
                        className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:bg-red-950 transition-colors"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'pending' && (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}
            {pendingLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(112,130,56)] mb-4" />
                  <p className="text-gray-600 dark:text-stone-300">Loading pending invitations...</p>
                </div>
              </div>
            )}
            {!pendingLoading && pending.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700">
                <p className="text-6xl mb-4">📬</p>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-stone-100 mb-2">No pending requests</h3>
                <p className="text-gray-600 dark:text-stone-300 text-center max-w-md">
                  When someone sends you a friend request, it will show up here. You can also check Notifications.
                </p>
              </div>
            )}
            {!pendingLoading && pending.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-stone-100">{t('friends.pending')}</h2>
                {pending.map((item) => (
                  <div
                    key={item._id}
                    className="bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[rgb(230,168,77)] flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                        {getInitials(item.requester.firstName, item.requester.lastName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800 dark:text-stone-100 truncate">
                          {item.requester.firstName} {item.requester.lastName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-stone-400 truncate">{item.requester.email}</p>
                        <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">{t('friends.wantsToBe')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAcceptPending(item._id)}
                        disabled={actingPendingId === item._id}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-[rgb(112,130,56)] text-white hover:bg-[rgb(95,110,48)] transition-colors disabled:opacity-50"
                      >
                        {actingPendingId === item._id ? 'Accepting...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleRejectPending(item._id)}
                        disabled={actingPendingId === item._id}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-300 hover:bg-gray-300 transition-colors disabled:opacity-50"
                      >
                        {actingPendingId === item._id ? 'Rejecting...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'shared' && (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700">
            <p className="text-6xl mb-4">📤</p>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-stone-100 mb-2">Shared with Me</h3>
            <p className="text-gray-600 dark:text-stone-300 text-center max-w-md">
              Items that friends have shared with you will appear here. Sharing is coming soon.
            </p>
          </div>
        )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-stone-100 mb-4">{t('friends.invite')}</h3>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-1">
                  Email address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@example.com"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(112,130,56)] focus:border-transparent bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100"
                />
              </div>
              {inviteMessage && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    inviteMessage.type === 'success'
                      ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                      : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                  }`}
                >
                  {inviteMessage.text}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="flex-1 px-4 py-2 bg-[rgb(112,130,56)] text-white rounded-lg font-medium hover:bg-[rgb(95,110,48)] transition-colors disabled:opacity-50"
                >
                  {inviteSubmitting ? 'Sending...' : 'Send Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteMessage(null);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-300 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
