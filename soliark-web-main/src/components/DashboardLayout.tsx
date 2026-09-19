'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { io } from 'socket.io-client';
import Sidebar from './Sidebar';
import { getCurrentUser, getUnreadNotificationsCount, API_BASE_URL, type CurrentUser } from '@/lib/api';
import { useI18n } from '@/i18n/I18nProvider';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [unreadCount, setUnreadCount] = useState(0);
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setUser(data);
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unauthenticated');
          router.replace('/auth');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAuthStatus('unauthenticated');
        router.replace('/auth');
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const fetchUnreadCount = useCallback(() => {
    getUnreadNotificationsCount().then(setUnreadCount);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    const socket = io(API_BASE_URL, { withCredentials: true });
    socket.on('notification', fetchUnreadCount);
    return () => {
      socket.off('notification', fetchUnreadCount);
      socket.close();
    };
  }, [user, fetchUnreadCount]);

  useEffect(() => {
    if (user && pathname) {
      fetchUnreadCount();
    }
  }, [pathname, user, fetchUnreadCount]);

  if (authStatus !== 'authenticated') {
    return (
      <div className="flex h-screen bg-background items-center justify-center" aria-busy="true">
        <div className="h-8 w-8 rounded-full border-2 border-[rgb(112,130,56)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background relative">
      {/* Mobile: unread notifications badge in top-right */}
      {unreadCount > 0 && (
        <Link
          href="/notifications"
          className="lg:hidden fixed top-4 right-4 z-50 min-w-[1.5rem] h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center shadow-md"
          aria-label={t('nav.notifications')}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Link>
      )}
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg shadow-md hover:bg-chip transition-colors"
        aria-label="Toggle menu"
      >
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isSidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <Sidebar
          userName={user ? `${user.firstName} ${user.lastName}` : undefined}
          userEmail={user?.email}
          unreadNotificationsCount={unreadCount}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full lg:w-auto">
        {children}
      </main>
    </div>
  );
}
