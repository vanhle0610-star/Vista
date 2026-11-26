import axios, { create, isAxiosError, AxiosError, type InternalAxiosRequestConfig } from 'axios';
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
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await authStorage.getAccessToken();
  if (token && config.headers && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ─── SILENT REFRESH TOKEN (AXIOS RESPONSE INTERCEPTOR) ──────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const isAuthUrl =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/refresh-token');

    // Chỉ tự động refresh khi gặp HTTP 401 trên các API nghiệp vụ
    if (status === 401 && !originalRequest._retry && !isAuthUrl) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await authStorage.getRefreshToken();
        if (!storedRefreshToken) {
          await authStorage.clearSession();
          return Promise.reject(error);
        }

        const refreshBase = (api.defaults.baseURL ?? defaultBaseUrl).replace(/\/+$/, '');
        const refreshRes = await axios.post(`${refreshBase}/auth/refresh`, {
          refreshToken: storedRefreshToken,
        });

        const data = refreshRes.data;
        const newAccessToken = data.accessToken;
        const newRefreshToken = data.refreshToken;

        await authStorage.setSession({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user: {
            id: data.id,
            email: data.email,
            displayName: data.displayName,
            roles: data.roles || ['ROLE_USER'],
          },
        });

        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await authStorage.clearSession();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export function apiErrorMessage(reason: unknown) {
  if (isAxiosError(reason)) {
    const data = reason.response?.data as { detail?: string; title?: string; message?: string } | undefined;
    if (data?.detail) return data.detail;
    if (data?.message) return data.message;
    if (data?.title) return data.title;

    const status = reason.response?.status;
    if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
    if (status === 404) return 'Không tìm thấy dữ liệu yêu cầu.';
    if (status === 409) return 'Dữ liệu bị xung đột hoặc thao tác đã được xử lý.';
    if (status && status >= 500) return 'Hệ thống máy chủ đang bận. Vui lòng thử lại sau.';

    return reason.code === 'ECONNABORTED'
      ? 'Máy chủ phản hồi quá lâu (quá thời gian chờ).'
      : reason.code === 'ERR_NETWORK' || reason.message?.includes('Network Error')
      ? 'Không thể kết nối máy chủ VISTA. Vui lòng kiểm tra kết nối mạng và đảm bảo máy chủ backend đang chạy.'
      : 'Không thể kết nối máy chủ. Kiểm tra địa chỉ API và kết nối mạng.';
  }
  if (reason instanceof Error) {
    return reason.message;
  }
  return 'Đã xảy ra lỗi không xác định.';
}
