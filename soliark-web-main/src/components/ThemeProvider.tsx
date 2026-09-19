'use client';

import { useEffect, type ReactNode } from 'react';

export const THEME_STORAGE_KEY = 'settings-extra';
export const THEME_CHANGE_EVENT = 'soliark-theme-change';

export type ThemePreference = 'Light' | 'Dark' | 'System';

export function resolveDark(theme: string): boolean {
  if (theme === 'Dark') return true;
  if (theme === 'Light') return false;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function readStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'Light';
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return 'Light';
    const parsed = JSON.parse(raw) as { preferences?: { theme?: string } };
    const theme = parsed.preferences?.theme;
    if (theme === 'Dark' || theme === 'System' || theme === 'Light') return theme;
    return 'Light';
  } catch {
    return 'Light';
  }
}

export function applyTheme(theme: string): void {
  if (typeof document === 'undefined') return;
  const dark = resolveDark(theme);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

export function notifyThemeChange(theme: string): void {
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

export function persistAndNotifyTheme(theme: string): void {
  if (theme !== 'Light' && theme !== 'Dark' && theme !== 'System') return;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as { preferences?: Record<string, unknown> })
      : {};
    parsed.preferences = { ...(parsed.preferences ?? {}), theme };
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Keep UI update even if storage fails.
  }
  notifyThemeChange(theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyTheme(readStoredTheme());

    const onThemeEvent = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail) applyTheme(detail);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        applyTheme(readStoredTheme());
      }
    };

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMedia = () => {
      if (readStoredTheme() === 'System') applyTheme('System');
    };

    window.addEventListener(THEME_CHANGE_EVENT, onThemeEvent);
    window.addEventListener('storage', onStorage);
    media.addEventListener('change', onMedia);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeEvent);
      window.removeEventListener('storage', onStorage);
      media.removeEventListener('change', onMedia);
    };
  }, []);

  return children;
}
