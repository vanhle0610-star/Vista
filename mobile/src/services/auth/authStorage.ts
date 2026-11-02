import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'vista_access_token';
const REFRESH_TOKEN_KEY = 'vista_refresh_token';
const USER_KEY = 'vista_user';

const memoryStorage = new Map<string, string>();

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return memoryStorage.get(key) ?? null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  memoryStorage.set(key, value);
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      return;
    }
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // fallback to memory
  }
}

async function deleteItem(key: string): Promise<void> {
  memoryStorage.delete(key);
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      return;
    }
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // fallback to memory
  }
}

export const authStorage = {
  async getAccessToken(): Promise<string | null> {
    const token = await getItem(ACCESS_TOKEN_KEY);
    if (token) return token;
    return getItem('vista_token');
  },
  async getRefreshToken(): Promise<string | null> {
    return getItem(REFRESH_TOKEN_KEY);
  },
  async getUser<T = unknown>(): Promise<T | null> {
    const raw = await getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async setSession(tokens: {
    accessToken: string;
    refreshToken?: string;
    user?: unknown;
  }): Promise<void> {
    if (tokens.accessToken) {
      await setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      await setItem('vista_token', tokens.accessToken);
    }
    if (tokens.refreshToken) {
      await setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
    if (tokens.user) {
      await setItem(USER_KEY, JSON.stringify(tokens.user));
    }
  },
  async clearSession(): Promise<void> {
    await deleteItem(ACCESS_TOKEN_KEY);
    await deleteItem('vista_token');
    await deleteItem(REFRESH_TOKEN_KEY);
    await deleteItem(USER_KEY);
    memoryStorage.clear();
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(ACCESS_TOKEN_KEY);
          window.localStorage.removeItem('vista_token');
          window.localStorage.removeItem(REFRESH_TOKEN_KEY);
          window.localStorage.removeItem(USER_KEY);
        }
      } catch {}
    }
  },
};

