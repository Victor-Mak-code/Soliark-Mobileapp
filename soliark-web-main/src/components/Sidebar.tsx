'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/api';
import { useI18n } from '@/i18n/I18nProvider';
import type { MessageKey } from '@/i18n/translations';

interface NavItem {
  labelKey: MessageKey;
  icon: string;
  path: string;
}

const navItems: NavItem[] = [
  { labelKey: 'nav.home', icon: '🏠', path: '/' },
  { labelKey: 'nav.library', icon: '📊', path: '/library' },
  { labelKey: 'nav.journals', icon: '📄', path: '/journals' },
  { labelKey: 'nav.ideasBoard', icon: '💡', path: '/ideas' },
  { labelKey: 'nav.brainstorm', icon: '🧠', path: '/brainstorm' },
  { labelKey: 'nav.storyboards', icon: '⊞', path: '/storyboards' },
  { labelKey: 'nav.shared', icon: '📤', path: '/shared' },
  { labelKey: 'nav.starred', icon: '⭐', path: '/starred' },
  { labelKey: 'nav.friends', icon: '👥', path: '/friends' },
  { labelKey: 'nav.collaboration', icon: '👤+', path: '/collaboration' },
  { labelKey: 'nav.export', icon: '📤', path: '/export' },
  { labelKey: 'nav.subscription', icon: '💳', path: '/subscription' },
  { labelKey: 'nav.notifications', icon: '🔔', path: '/notifications' },
  { labelKey: 'nav.settings', icon: '⚙️', path: '/settings' },
];

interface SidebarProps {
  userName?: string;
  userEmail?: string;
  unreadNotificationsCount?: number;
  onClose?: () => void;
}

export default function Sidebar({ userName, userEmail, unreadNotificationsCount = 0, onClose }: SidebarProps) {
  const { t } = useI18n();
  const displayName = userName ?? t('nav.loading');
  const displayEmail = userEmail ?? '...';
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/auth');
    } catch {
      router.push('/auth');
    }
  };

  const handleNavClick = (path: string) => {
    router.push(path);
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-border flex flex-col shadow-lg lg:shadow-none">
      {/* Logo */}
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-stone-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[rgb(112,130,56)] rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg">📷</span>
          </div>
          <span className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-stone-100">Soliark</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 sm:py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.path ||
            (item.path === '/library' && pathname?.startsWith('/library')) ||
            (item.path === '/ideas' && pathname?.startsWith('/ideas')) ||
            (item.path === '/brainstorm' && pathname?.startsWith('/brainstorm')) ||
            (item.path === '/starred' && pathname?.startsWith('/starred')) ||
            (item.path === '/notifications' && pathname?.startsWith('/notifications')) ||
            (item.path === '/friends' && pathname?.startsWith('/friends')) ||
            (item.path === '/shared' && pathname?.startsWith('/shared')) ||
            (item.path === '/collaboration' && pathname?.startsWith('/collaboration')) ||
            (item.path === '/storyboards' && pathname?.startsWith('/storyboards')) ||
            (item.path === '/export' && pathname?.startsWith('/export')) ||
            (item.path === '/subscription' && pathname?.startsWith('/subscription')) ||
            (item.path === '/settings' && pathname?.startsWith('/settings'));
          const showUnreadBadge = item.path === '/notifications' && unreadNotificationsCount > 0;
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`w-full flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 text-left transition-colors text-sm sm:text-base ${
                isActive
                  ? 'bg-[rgb(139,69,19)]/30 text-[rgb(139,69,19)] dark:bg-[rgb(230,168,77)]/20 dark:text-[rgb(230,168,77)] font-medium'
                  : 'text-gray-700 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800'
              }`}
            >
              <span className="text-base sm:text-lg flex-shrink-0">{item.icon}</span>
              <span className="truncate flex-1">{t(item.labelKey)}</span>
              {showUnreadBadge && (
                <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-gray-200 dark:border-stone-700 p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[rgb(112,130,56)] rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
            {(userName?.charAt(0) ?? '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-stone-100 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 dark:text-stone-400 truncate">{displayEmail}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-gray-700 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 rounded transition-colors text-xs sm:text-sm"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>{t('nav.signOut')}</span>
        </button>
      </div>
    </div>
  );
}

