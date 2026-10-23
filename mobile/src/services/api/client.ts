import { create, isAxiosError } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { authStorage } from '../auth/authStorage';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch {}
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch {}
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

const defaultBaseUrl =
  Platform.OS === 'android' ? 'http://10.0.2.2:8081/api/v1' : 'http://localhost:8081/api/v1';

export const api = create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? defaultBaseUrl,
  timeout: 10_000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = (await authStorage.getAccessToken()) ?? (await storage.getItem('vista_token'));
  if (token && config.headers && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export function apiErrorMessage(reason: unknown) {
  if (isAxiosError(reason)) {
    const data = reason.response?.data as { detail?: string } | undefined;
    return (
      data?.detail ??
      (reason.code === 'ECONNABORTED'
        ? 'Máy chủ phản hồi quá lâu.'
        : 'Không thể kết nối máy chủ.')
    );
  }
  return 'Đã xảy ra lỗi không xác định.';
}
