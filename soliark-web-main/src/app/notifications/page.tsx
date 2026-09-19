'use client';

import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import DashboardLayout from '@/components/DashboardLayout';
import {
  API_BASE_URL,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  acceptFriendRequest,
  rejectFriendRequest,
  type NotificationItem,
  type NotificationType,
} from '@/lib/api';
import { Check, Eye, Trash2, Share2, Star, MessageCircle, Bell, Users } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

type TabKey = 'all' | 'unread' | 'shares' | 'collaboration' | 'system';

const TABS: { key: TabKey; label: string; type?: NotificationType; unreadOnly?: boolean }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread', unreadOnly: true },
  { key: 'shares', label: 'Shares', type: 'share' },
  { key: 'collaboration', label: 'Collaboration', type: 'collaboration' },
  { key: 'system', label: 'System', type: 'system' },
];

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'friend_invite':
      return <Users className="w-8 h-8 text-blue-600" />;
    case 'share':
      return (
        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
          <Share2 className="w-6 h-6 text-blue-600" />
        </div>
      );
    case 'starred':
      return (
        <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
          <Star className="w-6 h-6 text-amber-600" />
        </div>
      );
    case 'collaboration':
      return (
        <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-green-600" />
        </div>
      );
    case 'system':
      return (
        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-stone-800 flex items-center justify-center">
          <Bell className="w-6 h-6 text-gray-600 dark:text-stone-300" />
        </div>
      );
    default:
      return (
        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-stone-800 flex items-center justify-center">
          <Bell className="w-6 h-6 text-gray-600 dark:text-stone-300" />
        </div>
      );
  }
}

function getCardBgClass(type: NotificationType, read: boolean): string {
  if (!read) return 'bg-amber-50/80 border-amber-100';
  if (type === 'share' || type === 'starred') return 'bg-amber-50/50 border-gray-100 dark:border-stone-800';
  return 'bg-white dark:bg-stone-900 border-gray-200 dark:border-stone-700';
}

export default function NotificationsPage() {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [actingFriendId, setActingFriendId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const tab = TABS.find((t) => t.key === activeTab);
      const params =
        tab?.type !== undefined
          ? { type: tab.type }
          : tab?.unreadOnly
            ? { unreadOnly: true }
            : {};
      const response = await getNotifications(params);
      if (response.data) setNotifications(response.data);
      if (typeof response.unreadCount === 'number') setUnreadCount(response.unreadCount);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const socket = io(API_BASE_URL, { withCredentials: true });
    socket.on('notification', () => {
      fetchNotifications();
    });
    return () => {
      socket.close();
    };
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      setMarkingAllRead(true);
      await markAllNotificationsRead();
      await fetchNotifications();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to mark all as read');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      const removed = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (removed && !removed.read) setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleAcceptFriend = async (notificationId: string, friendshipId: string) => {
    try {
      setActingFriendId(notificationId);
      setError('');
      await acceptFriendRequest(friendshipId);
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      setUnreadCount((c) => Math.max(0, c - 1));
      setSuccessMessage('Friend request accepted.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to accept friend request');
    } finally {
      setActingFriendId(null);
    }
  };

  const handleRejectFriend = async (notificationId: string, friendshipId: string) => {
    if (!confirm('Reject this friend request?')) return;
    try {
      setActingFriendId(notificationId);
      setError('');
      await rejectFriendRequest(friendshipId);
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      setUnreadCount((c) => Math.max(0, c - 1));
      setSuccessMessage('Friend request rejected.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject friend request');
    } finally {
      setActingFriendId(null);
    }
  };

  const getTabCount = (key: TabKey) => {
    if (key === 'all') return notifications.length;
    if (key === 'unread') return unreadCount;
    const tab = TABS.find((t) => t.key === key);
    if (tab?.type) return notifications.filter((n) => n.type === tab.type).length;
    return 0;
  };

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`.toUpperCase() || '?';

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-stone-100 mb-1">{t('notifications.title')}</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-stone-300">
              {t('notifications.subtitle')}
            </p>
          </div>
          <button
            onClick={handleMarkAllRead}
            disabled={markingAllRead || unreadCount === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-[rgb(112,130,56)] text-white hover:bg-[rgb(95,110,48)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            {t('notifications.markAllRead')}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((tab) => {
            const count = getTabCount(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[rgb(139,69,19)]/30 text-[rgb(139,69,19)]'
                    : 'bg-white dark:bg-stone-900 text-gray-700 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 border border-gray-200 dark:border-stone-700'
                }`}
              >
                {tab.label}
                {tab.key === 'all' && (
                  <span className="text-gray-500 dark:text-stone-400">({notifications.length})</span>
                )}
                {tab.key === 'unread' && unreadCount > 0 && (
                  <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
                {tab.key === 'shares' && count > 0 && (
                  <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

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
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(112,130,56)] mb-4" />
              <p className="text-gray-600 dark:text-stone-300">Loading notifications...</p>
            </div>
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-stone-900 rounded-lg border border-gray-200 dark:border-stone-700">
            <Bell className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 dark:text-stone-100 mb-2">No notifications</h3>
            <p className="text-gray-600 dark:text-stone-300 text-center max-w-md">
              {activeTab === 'unread'
                ? "You're all caught up."
                : activeTab !== 'all'
                  ? `No ${activeTab} notifications.`
                  : 'When you get notifications, they will show up here.'}
            </p>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`rounded-lg border p-4 sm:p-6 shadow-sm ${getCardBgClass(n.type, n.read)}`}
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">{getNotificationIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-stone-100">{n.title}</p>
                    <p className="text-sm text-gray-600 dark:text-stone-300 mt-1">{n.message}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <div className="w-7 h-7 rounded-full bg-[rgb(112,130,56)] flex items-center justify-center text-white text-xs font-medium">
                        {getInitials(n.fromUser.firstName, n.fromUser.lastName)}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-stone-300">
                        {n.fromUser.firstName} {n.fromUser.lastName}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-stone-400">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                      {!n.read && (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-300">
                          New
                        </span>
                      )}
                    </div>
                    {n.type === 'friend_invite' && n.friendshipId && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          onClick={() => handleAcceptFriend(n._id, n.friendshipId!)}
                          disabled={actingFriendId === n._id}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[rgb(112,130,56)] text-white hover:bg-[rgb(95,110,48)] transition-colors disabled:opacity-50"
                        >
                          {actingFriendId === n._id ? 'Accepting...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleRejectFriend(n._id, n.friendshipId!)}
                          disabled={actingFriendId === n._id}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-300 hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                          {actingFriendId === n._id ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleMarkRead(n._id)}
                      className="p-2 rounded-full text-gray-500 dark:text-stone-400 hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors"
                      aria-label="Mark as read"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n._id)}
                        className="p-2 rounded-full text-gray-500 dark:text-stone-400 hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors"
                        aria-label="Mark read"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n._id)}
                      className="p-2 rounded-full text-gray-500 dark:text-stone-400 hover:bg-red-50 dark:bg-red-950 hover:text-red-600 transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
