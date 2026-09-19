'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;
const MAX_TOASTS = 5;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    const ref = timeoutRefs.current[id];
    if (ref) {
      clearTimeout(ref);
      delete timeoutRefs.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => {
        const next = [...prev, { id, message, type }].slice(-MAX_TOASTS);
        return next;
      });

      const timeoutId = setTimeout(() => {
        removeToast(id);
        delete timeoutRefs.current[id];
      }, TOAST_DURATION_MS);
      timeoutRefs.current[id] = timeoutId;
    },
    [removeToast]
  );

  const value: ToastContextValue = { toasts, toast, removeToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const context = useContext(ToastContext);
  if (!context) return null;
  const { toasts, removeToast } = context;

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role="alert"
          className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-lg text-sm font-medium transition-opacity ${
            item.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200'
              : item.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200'
                : 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950 dark:border-sky-800 dark:text-sky-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="flex-1">{item.message}</p>
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              className="flex-shrink-0 opacity-70 hover:opacity-100 focus:outline-none"
              aria-label="Dismiss"
            >
              <span className="sr-only">Dismiss</span>
              <span aria-hidden>×</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
