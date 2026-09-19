import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type AppRoute =
  | { name: 'home' }
  | { name: 'library' }
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

type NavigationContextValue = {
  route: AppRoute;
  stack: AppRoute[];
  push: (route: AppRoute) => void;
  replace: (route: AppRoute) => void;
  back: () => void;
  canGoBack: boolean;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<AppRoute[]>([{ name: 'home' }]);
  const route = stack[stack.length - 1] ?? { name: 'home' };

  const push = useCallback((next: AppRoute) => {
    setStack((prev) => [...prev, next]);
  }, []);

  const replace = useCallback((next: AppRoute) => {
    setStack([next]);
  }, []);

  const back = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const value = useMemo(
    () => ({
      route,
      stack,
      push,
      replace,
      back,
      canGoBack: stack.length > 1,
    }),
    [route, stack, push, replace, back]
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
