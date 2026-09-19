import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const COOKIE_KEY = '@soliark/session-cookie';
const DEFAULT_API_HOST = 'https://api.soliark.com';

function normalizeApiHost(host?: string): string {
  const value = (host || DEFAULT_API_HOST).trim().replace(/\/+$/, '');
  return value || DEFAULT_API_HOST;
}

export const API_BASE_URL = normalizeApiHost(process.env.EXPO_PUBLIC_API_HOST);

function apiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${suffix}`;
}

let memoryCookie: string | null | undefined;

async function readPersistedCookie(): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') {
      const secure = await SecureStore.getItemAsync(COOKIE_KEY);
      if (secure) return secure;
    }
  } catch {
    // Fall back to AsyncStorage.
  }
  return AsyncStorage.getItem(COOKIE_KEY);
}

export async function getSessionCookie(): Promise<string | null> {
  if (memoryCookie !== undefined) return memoryCookie;
  memoryCookie = await readPersistedCookie();
  return memoryCookie;
}

export async function persistSessionCookie(cookie: string | null): Promise<void> {
  memoryCookie = cookie;
  if (!cookie) {
    await AsyncStorage.removeItem(COOKIE_KEY);
    if (Platform.OS !== 'web') {
      try {
        await SecureStore.deleteItemAsync(COOKIE_KEY);
      } catch {
        // ignore
      }
    }
    return;
  }
  await AsyncStorage.setItem(COOKIE_KEY, cookie);
  if (Platform.OS !== 'web') {
    try {
      await SecureStore.setItemAsync(COOKIE_KEY, cookie);
    } catch {
      // ignore
    }
  }
}

function captureSetCookie(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const fromList = headers.getSetCookie?.()?.[0];
  const raw = fromList || response.headers.get('set-cookie') || response.headers.get('Set-Cookie');
  if (!raw) return;
  const pair = raw.split(';')[0]?.trim();
  if (pair) {
    void persistSessionCookie(pair);
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const cookie = await getSessionCookie();
  const headers = new Headers(init.headers);

  if (cookie && !headers.has('Cookie')) {
    headers.set('Cookie', cookie);
  }

  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: 'include',
  });

  captureSetCookie(response);
  return response;
}

export type UploadFile = {
  uri: string;
  name: string;
  type: string;
};

export function appendUploadFile(formData: FormData, field: string, file: UploadFile) {
  formData.append(field, {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
}
