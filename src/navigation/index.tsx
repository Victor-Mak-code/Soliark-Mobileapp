import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BackHandler } from 'react-native';

export type AppRoute =
  | { name: 'home' }
  | { name: 'library'; filter?: 'All Content' | 'Write-ups' | 'Docs' | 'Images' | 'Audio' | 'Video' | 'Starred' | 'Collaboration' }
  | { name: 'journals'; mode?: 'write' | 'voice' | 'upload' }
  | { name: 'journal'; id: string }
  | { name: 'ideas' }
  | { name: 'idea'; id: string }
  | { name: 'idea-new' }
  | { name: 'brainstorm' }
  | { name: 'brainstorm-space'; id: string }
  | { name: 'friends' }
  | { name: 'shared' }
  | { name: 'shared-item'; id: string }
  | { name: 'starred' }
  | { name: 'collaboration' }
  | { name: 'collaboration-journal'; journalId: string }
  | { name: 'storyboards' }
  | { name: 'export' }
  | { name: 'subscription' }
  | { name: 'notifications' }
  | { name: 'settings' }
  | { name: 'create-video'; journalId: string };

export type TabKey = 'home' | 'library' | 'journals' | 'friends';

type StackEntry = {
  route: AppRoute;
  showHeaderBack: boolean;
};

type NavigationContextValue = {
  route: AppRoute;
  stack: AppRoute[];
  push: (route: AppRoute) => void;
  replace: (route: AppRoute) => void;
  back: () => void;
  canGoBack: boolean;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

const DETAIL_ROUTES = new Set<AppRoute['name']>([
  'journal',
  'idea',
  'idea-new',
  'brainstorm-space',
  'shared-item',
  'collaboration-journal',
  'create-video',
]);

function isSameRoute(a: AppRoute, b: AppRoute): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<StackEntry[]>([
    { route: { name: 'home' }, showHeaderBack: false },
  ]);
  const current = entries[entries.length - 1] ?? { route: { name: 'home' }, showHeaderBack: false };
  const route = current.route;

  const push = useCallback((next: AppRoute) => {
    setEntries((prev) => [...prev, { route: next, showHeaderBack: true }]);
  }, []);

  const replace = useCallback((next: AppRoute) => {
    setEntries((prev) => {
      const top = prev[prev.length - 1];
      if (top && isSameRoute(top.route, next)) {
        return prev;
      }
      if (DETAIL_ROUTES.has(next.name)) {
        const base = prev.length > 0 ? prev.slice(0, -1) : [{ route: { name: 'home' as const }, showHeaderBack: false }];
        return [...base, { route: next, showHeaderBack: true }];
      }
      if (next.name === 'home') {
        return [{ route: { name: 'home' }, showHeaderBack: false }];
      }
      const withoutPushed = prev.filter((item) => !item.showHeaderBack);
      const base = withoutPushed.length > 0 ? withoutPushed : [{ route: { name: 'home' as const }, showHeaderBack: false }];
      const lastBase = base[base.length - 1];
      if (lastBase && isSameRoute(lastBase.route, next)) {
        return base;
      }
      return [...base, { route: next, showHeaderBack: false }];
    });
  }, []);

  const back = useCallback(() => {
    setEntries((prev) => {
      if (prev.length > 1) {
        return prev.slice(0, -1);
      }
      if (prev[0]?.route.name !== 'home') {
        return [{ route: { name: 'home' }, showHeaderBack: false }];
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (entries.length > 1) {
        back();
        return true;
      }
      if (route.name !== 'home') {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [entries.length, route.name, back]);

  const stack = useMemo(() => entries.map((e) => e.route), [entries]);

  const value = useMemo(
    () => ({
      route,
      stack,
      push,
      replace,
      back,
      canGoBack: current.showHeaderBack,
    }),
    [route, stack, push, replace, back, current.showHeaderBack]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return ctx;
}

export function routeTitle(route: AppRoute): string {
  switch (route.name) {
    case 'home':
      return 'Home';
    case 'library':
      return 'Library';
    case 'journals':
      return 'Create';
    case 'journal':
      return 'Journal';
    case 'ideas':
      return 'Ideas';
    case 'idea':
      return 'Idea';
    case 'idea-new':
      return 'New idea';
    case 'brainstorm':
      return 'Brainstorm';
    case 'brainstorm-space':
      return 'Space';
    case 'friends':
      return 'Friends';
    case 'shared':
      return 'Shared';
    case 'shared-item':
      return 'Shared journal';
    case 'starred':
      return 'Starred';
    case 'collaboration':
      return 'Collaboration';
    case 'collaboration-journal':
      return 'Workspace';
    case 'storyboards':
      return 'Storyboards';
    case 'export':
      return 'Export';
    case 'subscription':
      return 'Plans';
    case 'notifications':
      return 'Alerts';
    case 'settings':
      return 'Settings';
    case 'create-video':
      return 'New video';
    default:
      return 'Soliark';
  }
}

export function isTabRoute(route: AppRoute): TabKey | null {
  if (route.name === 'home') return 'home';
  if (route.name === 'library') return 'library';
  if (route.name === 'journals') return 'journals';
  if (route.name === 'friends') return 'friends';
  return null;
}
